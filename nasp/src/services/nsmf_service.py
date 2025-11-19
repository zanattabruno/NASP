import os
import logging
import time
import json
import requests
import random
import subprocess
from pathlib import Path


SERVICE_DIR = Path(__file__).resolve().parent
REPO_ROOT = SERVICE_DIR.parents[2]


class NsmfService():
    """Nsmf Service Class"""
    
    OPEN5GS_TARGET = {
        "name": os.getenv("OPEN5GS_INSTANCE_NAME", "open5gs-sample"),
        "namespace": os.getenv("OPEN5GS_NAMESPACE", "default")
    }

    MANIFEST_PATHS = {
        "stack": REPO_ROOT / "k8s-manifests" / "open5gs-one-slice.yaml",
        "generated": REPO_ROOT / "k8s-manifests" / "generated"
    }
    
    # rApp Configuration
    RAPP_CONFIG = {
        "base_url": os.getenv("RAPP_BASE_URL"),
        "endpoints": {
            "create_slice_policy": os.getenv("RAPP_CREATE_SLICE_ENDPOINT", "/create_slice_policy")
        }
    }
    
    def __init__(self):
        """Initialize helper paths for manifest management"""
        self.generated_manifest_dir = self.MANIFEST_PATHS["generated"]
        self.generated_manifest_dir.mkdir(parents=True, exist_ok=True)
    
    def allocNsi(self, req):
        """Get All NSSTs Core"""
        try:
            logging.info("allocNSI")
            
            # Prefer S-NSSAI requested on the frontend; fallback to generated value
            S_NSSAI = self._extract_requested_snssai(req.json)
            if not S_NSSAI:
                S_NSSAI = "1" + f"2744{int(random.random() * 100)}"
            logging.info(f"S_NSSAI Selected = {S_NSSAI}")
            
            # Process IMSI Range data
            imsi_range = req.json.get("imsi_range", "")
            imsi_data = {}
            
            # Process authentication configuration
            auth_config = req.json.get("auth_config")
            if auth_config:
                logging.info(f"Processing authentication config: {auth_config.get('method', 'auto')}")
            
            manifest_path = None
            if imsi_range:
                logging.info(f"Processing IMSI Range: {imsi_range}")
                imsi_data = self.process_imsi_range(imsi_range)
                logging.info(f"IMSI Data processed: {imsi_data}")
                
                if imsi_data.get("valid", False):
                    logging.info("Preparing Open5GS manifests for subscriber provisioning")
                    nsi_data_for_manifest = {
                        "S_NSSAI": S_NSSAI,
                        "imsi_data": imsi_data,
                        "auth_config": auth_config,
                        "description": req.json.get("description", {}),
                        "resource_description": req.json.get("resource_description", {})
                    }
                    manifest_path = self.apply_open5gs_manifests(nsi_data_for_manifest)
                    if manifest_path:
                        logging.info("Open5GS user manifests applied successfully")
                    else:
                        logging.error("Failed to apply Open5GS user manifests")
                else:
                    logging.error("Invalid IMSI data, skipping manifest application")
            
            # Include IMSI data in the stored information
            data = {
                "name": req.json["name"], 
                "description": req.json["description"], 
                "S_NSSAI": S_NSSAI,
                "imsi_range": imsi_range,
                "imsi_data": imsi_data,
                "k8s_resources": {
                    "open5gs_stack": str(self.MANIFEST_PATHS["stack"]),
                    "open5gs_users_manifest": str(manifest_path) if manifest_path else None,
                    "label_selector": f"nasp.slice={S_NSSAI}"
                }
            }
            
            logging.info(data)
            # Added url to post data to rAppNASP when configured
            rapp_url = None
            base_url = self.RAPP_CONFIG.get("base_url")
            if base_url:
                rapp_url = f"{base_url}{self.RAPP_CONFIG['endpoints']['create_slice_policy']}"
            self.add_to_db(data, "nsi", rapp_url)
            # Note: Helm deployment functionality has been removed
            return f"Alloc Completed with success", 200
        except Exception as exception:
            return f"Bad Request - {str(exception)}", 400

    def getAllNsi(self, request):
        """Get All NSIs"""
        try:
            data = open("../data/db/nsi.json", "r", encoding="utf-8")
            return json.load(data)
        except Exception as exception:
            return f"Bad Request - {exception}", 400

    def add_nsi(self, nsi):
        """Get All NSSTs Core"""
        try:
            data = open("../data/db/nsi.json", encoding="utf-8")
            try:
                nsi_list = json.load(data)
            except Exception as exception:
                print(str(exception))
                nsi_list = []
            
            nsi_list.append(nsi)
            f = open("../data/db/nsi.json", "w", encoding="utf-8")
            f.write(json.dumps(nsi_list))
            f.close()
            return data
        except Exception as exception:
            return f"Bad Request - {exception}", 400

    def post_data(self, data, url):
        if not url:
            return
        try:
            response = requests.post(url, json=data)
            response.raise_for_status()
        except Exception as exception:
            logging.warning(f"Failed to POST data to rApp endpoint {url}: {exception}")

    def add_to_db(self, data, table, url=None):
        try:
            with open(f"../data/db/{table}.json", encoding="utf-8") as db_data:
                try:
                    nsi_list = json.load(db_data)
                except Exception as exception:
                    print(str(exception))
                    nsi_list = []
            nsi_list.append(data)
            with open(f"../data/db/{table}.json", "w", encoding="utf-8") as f:
                json.dump(nsi_list, f)
            self.post_data(data, url)
        except Exception as exception:
            print(str(exception))

    def apply_open5gs_manifests(self, nsi_payload):
        """Apply Open5GS base stack and user manifests derived from NSI payload"""
        try:
            self._apply_open5gs_stack()
            manifest_path = self._render_and_apply_open5gs_users(nsi_payload)
            return str(manifest_path) if manifest_path else None
        except Exception as exception:
            logging.error(f"Failed to apply Open5GS manifests: {str(exception)}")
            return None

    def _apply_open5gs_stack(self):
        stack_path = self.MANIFEST_PATHS["stack"]
        if not stack_path.exists():
            logging.warning(f"Open5GS stack manifest not found at {stack_path}")
            return False
        logging.info(f"Applying Open5GS stack manifest: {stack_path}")
        return self._kubectl_apply(stack_path)

    def _render_and_apply_open5gs_users(self, nsi_payload):
        resources = self._prepare_open5gs_user_resources(nsi_payload)
        if not resources:
            logging.warning("No Open5GS user resources generated from NSI data")
            return None
        manifest_path = self._create_user_manifest_file(resources)
        if not manifest_path:
            return None
        logging.info(f"Applying generated Open5GS users manifest: {manifest_path}")
        if self._kubectl_apply(manifest_path):
            return manifest_path
        return None

    def _prepare_open5gs_user_resources(self, nsi_payload):
        imsi_data = nsi_payload.get("imsi_data", {})
        if not imsi_data.get("valid", False):
            return []
        slice_configs = self.extract_slice_config_from_nsi(nsi_payload) or []
        slice_config = slice_configs[0] if slice_configs else {"sst": 1, "sd": "111111"}
        apn = self._extract_default_apn(nsi_payload)
        auth_config = nsi_payload.get("auth_config")
        start_imsi = int(imsi_data["start"])
        end_imsi = int(imsi_data["end"])
        resources = []
        for imsi_num in range(start_imsi, end_imsi + 1):
            imsi = str(imsi_num).zfill(15)
            if auth_config:
                k, opc = self._process_authentication_keys(imsi, auth_config)
            else:
                k = self._generate_security_key()
                opc = self._generate_opc_key()
            resource = {
                "apiVersion": "net.gradiant.org/v1",
                "kind": "Open5GSUser",
                "metadata": {
                    "name": f"nasp-user-{imsi}",
                    "labels": {
                        "app.kubernetes.io/name": "open5gs-operator",
                        "app.kubernetes.io/managed-by": "nasp",
                        "nasp.slice": nsi_payload.get("S_NSSAI", "unknown"),
                        "nasp.imsi": imsi
                    }
                },
                "spec": {
                    "imsi": imsi,
                    "key": k,
                    "opc": opc,
                    "sd": self._normalize_sd_value(slice_config.get("sd")),
                    "sst": str(slice_config.get("sst", 1)),
                    "apn": apn,
                    "open5gs": {
                        "name": self.OPEN5GS_TARGET["name"],
                        "namespace": self.OPEN5GS_TARGET["namespace"]
                    }
                }
            }
            resources.append(resource)
        return resources

    def _extract_default_apn(self, nsi_payload):
        try:
            core_nfs = nsi_payload.get("resource_description", {}).get("core", {}).get("nfs", [])
            for nf in core_nfs:
                config = nf.get("config", {})
                dnn_list = config.get("supportDnnList") or []
                if dnn_list:
                    return dnn_list[0]
        except Exception:
            pass
        return "internet"

    def _normalize_sd_value(self, sd_value):
        if sd_value is None:
            return "111111"
        sd_str = str(sd_value)
        if sd_str.startswith("0x") or sd_str.startswith("0X"):
            return sd_str[2:]
        return sd_str

    def _extract_requested_snssai(self, payload):
        """Return concatenated SST/SD from the frontend request when available"""
        try:
            description = payload.get("description") or {}
            resource_desc = description.get("resource_description") or {}
            core_nfs = resource_desc.get("core", {}).get("nfs", [])
            for nf in core_nfs:
                config = nf.get("config", {})
                plmn_support = config.get("plmnSupportList") or []
                for plmn in plmn_support:
                    for snssai in plmn.get("snssaiList", []):
                        sst = snssai.get("sst")
                        sd = snssai.get("sd")
                        if sst is None or sd is None:
                            continue
                        sd_norm = self._normalize_sd_value(sd)
                        return f"{int(sst)}{sd_norm}"
        except Exception as exc:
            logging.warning(f"Failed to extract requested S-NSSAI from payload: {exc}")
        return None

    def _create_user_manifest_file(self, resources):
        if not resources:
            return None
        manifest = {
            "apiVersion": "v1",
            "kind": "List",
            "items": resources
        }
        timestamp = int(time.time() * 1000)
        manifest_path = self.generated_manifest_dir / f"open5gs-users-{timestamp}.json"
        with open(manifest_path, "w", encoding="utf-8") as manifest_file:
            json.dump(manifest, manifest_file, indent=2)
        return manifest_path

    def _run_kubectl(self, args, input_data=None):
        cmd = ["kubectl"] + [str(arg) for arg in args]
        logging.info("Executing command: %s", " ".join(cmd))
        try:
            result = subprocess.run(
                cmd,
                input=input_data,
                text=True,
                capture_output=True,
                check=True
            )
            stdout = result.stdout.strip()
            stderr = result.stderr.strip()
            if stdout:
                logging.info(stdout)
            if stderr:
                logging.debug(stderr)
            return True, result.stdout
        except FileNotFoundError:
            logging.error("kubectl not found. Ensure it is installed and available in the system PATH.")
        except subprocess.CalledProcessError as exc:
            stderr = (exc.stderr or "").strip()
            stdout = (exc.stdout or "").strip()
            if stdout:
                logging.error(stdout)
            if stderr:
                logging.error(stderr)
        return False, ""

    def _kubectl_apply(self, manifest_path):
        manifest_str = str(manifest_path)
        if not os.path.exists(manifest_str):
            logging.error(f"Manifest file not found: {manifest_str}")
            return False
        success, _ = self._run_kubectl(["apply", "-f", manifest_str])
        return success

    def _delete_open5gs_user(self, imsi):
        resource_name = f"nasp-user-{imsi}"
        success, _ = self._run_kubectl([
            "delete",
            "open5gsuser",
            resource_name,
            "--ignore-not-found"
        ])
        return success

    def _delete_open5gs_users_by_label(self, label_selector):
        success, _ = self._run_kubectl([
            "delete",
            "open5gsusers",
            "-l",
            label_selector,
            "--ignore-not-found"
        ])
        return success

    def deploy_transport_network(self, low_latency=True):
        intents = []
        short_path = [
            [("of:0000000000000001","3"),("of:0000000000000001","4")],[("of:0000000000000001","4"),("of:0000000000000001","3")],
            [("of:0000000000000004","2"),("of:0000000000000001","3")],[("of:0000000000000004","4"),("of:0000000000000001","2")]
        ]
        long_path = [
            [("of:0000000000000001","4"),("of:0000000000000001","2")],[("of:0000000000000001","2"),("of:0000000000000001","4")],
            [("of:0000000000000002","1"),("of:0000000000000002","2")],[("of:0000000000000002","2"),("of:0000000000000002","1")],
            [("of:0000000000000003","1"),("of:0000000000000003","2")],[("of:0000000000000003","2"),("of:0000000000000003","1")],
            [("of:0000000000000004","1"),("of:0000000000000004","3")],[("of:0000000000000004","4"),("of:0000000000000004","1")]
        ]
        if low_latency:
            intents = short_path
        else:
            intents = long_path
        self.deploy_onos_intents(intents)
        return

    def deploy_onos_intents(self, intents):
        for intent in intents:
            url = "http://67.205.130.238:8181/onos/v1/intents"
            headers = {'Content-Type': 'application/json','Authorization': 'Basic b25vczpyb2Nrcw=='}
            data = {
                "type": "PointToPointIntent",
                "appId": "org.onosproject.cli",
                "ingressPoint": {
                    "device": intent[0][0],
                    "port": intent[0][1]
                },
                "egressPoint": {
                    "device": intent[1][0],
                    "port": intent[1][1]
                }
            }
            response = requests.post(url, headers=headers, json=data)
            logging.info(f"Created Intent: {intent} - Response Status: {response.status_code}")
            time.sleep(0.05)
        return

    def clear_environment(self):
        self.delete_delay()
        self.delete_onos_intents()
        self._delete_open5gs_users_by_label("app.kubernetes.io/managed-by=nasp")
        try:
            open("../data/db/nsi.json", "w", encoding="utf-8").write("[]")
            return f"Environment Cleared", 200
        except Exception as exception:
            return f"Bad Request - {exception}", 400

    def delete_onos_intents(self):

        url = "http://67.205.130.238:8181/onos/v1/intents"
        headers = {'Authorization': 'Basic b25vczpyb2Nrcw=='}
        response = requests.get(url, headers=headers)
        for intent in response.json()["intents"]:
            requests.delete(url+"/org.onosproject.cli/"+intent["id"], headers=headers)

    def create_delay(self, delay):
        cmd_list = [f'ssh 127.0.0.1 "tc qdisc add dev eth1 root handle 1: prio;tc filter add dev eth1 parent 1:0 protocol ip prio 1 u32 match ip dst 10.116.0.3 flowid 2:1;tc qdisc add dev eth1 parent 1:1 handle 2: netem delay {delay}ms"',
                    f'ssh 165.227.202.171 "tc qdisc add dev eth1 root handle 1: prio;tc filter add dev eth1 parent 1:0 protocol ip prio 1 u32 match ip dst 10.116.0.2 flowid 2:1;tc qdisc add dev eth1 parent 1:1 handle 2: netem delay {delay-20}ms"']
        for cmd in cmd_list:
            try:
                result = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT)
                return result.decode('utf-8')
            except Exception as exception:
                raise Exception(exception.output.decode('utf-8'))
    





    def getAllNsi(self, request):
        """Get All NSIs"""
        try:
            data = open("../data/db/nsi.json", "r", encoding="utf-8")
            return json.load(data)
        except Exception as exception:
            return f"Bad Request - {exception}", 400
        
    def get_all_nst(self, request):
        """Get All NSTs"""
        try:
            data = open("../data/db/nst.json", "r", encoding="utf-8")
            return json.load(data)

        except Exception as exception:
            return f"Bad Request - {exception}", 400

    def get_nst(self, id):
        """Get NSTs"""
        try:
            data = open("../data/db/nst.json", "r", encoding="utf-8")
            for item in json.load(data):
                print(item['id'] + id)
                if item['id'] == id:
                    print(item)
                    return item
        except Exception as exception:
            return f"Bad Request - {exception}", 400
        return {}

    def add_nst(self, request):
        """Get All NSSTs Core"""
        try:
            data = open("../data/db/nst.json", encoding="utf-8")
            try:
                nst_list = json.load(data)
            except Exception as exception:
                print(str(exception))
                nst_list = []
            if request.json.get("is_shared") == "on": is_shared = True
            if request.json.get("is_shared") == "": is_shared = False
                
            nst_list.append({
                "name": request.json.get("name"),
                "description": request.json.get("description"),
                "ran_nsst": request.json.get("ran_nsst"),
                "core_nsst": request.json.get("core_nsst"),
                "id": "1",
                "status": "Ready",
                "is_shared": is_shared,
                "RN_path": f"../helm_charts/ran/{request.json.get('ran_nsst')}",
                "TN_path": "",
                "CN_path": f"../helm_charts/core/{request.json.get('core_nsst')}"
            })
            f = open("../data/db/nst.json", "w", encoding="utf-8")
            print(type(nst_list[0]))
            f.write(json.dumps(nst_list))
            f.close()
            return data
        except Exception as exception:
            return f"Bad Request - {exception}", 400

    def add_nsi(self, nsi):
        """Get All NSSTs Core"""
        try:
            data = open("../data/db/nsi.json", encoding="utf-8")
            try:
                nsi_list = json.load(data)
            except Exception as exception:
                print(str(exception))
                nsi_list = []
            
            nsi_list.append(nsi)
            f = open("../data/db/nsi.json", "w", encoding="utf-8")
            f.write(json.dumps(nsi_list))
            f.close()
            return data
        except Exception as exception:
            return f"Bad Request - {exception}", 400

    def process_imsi_range(self, imsi_range):
        """Process and validate IMSI range"""
        try:
            # Parse IMSI range (format: START-END)
            if '-' not in imsi_range:
                raise ValueError("Invalid IMSI range format. Expected: START-END")
            
            start_imsi, end_imsi = imsi_range.split('-')
            start_imsi = start_imsi.strip()
            end_imsi = end_imsi.strip()
            
            # Validate IMSI format (15 digits)
            if len(start_imsi) != 15 or len(end_imsi) != 15:
                raise ValueError("IMSI must be exactly 15 digits")
            
            if not start_imsi.isdigit() or not end_imsi.isdigit():
                raise ValueError("IMSI must contain only digits")
            
            # Calculate range details
            start_num = int(start_imsi)
            end_num = int(end_imsi)
            
            if start_num >= end_num:
                raise ValueError("Start IMSI must be less than end IMSI")
            
            imsi_count = end_num - start_num + 1
            
            # Extract MCC, MNC (first 5-6 digits typically)
            mcc = start_imsi[:3]  # Mobile Country Code
            mnc = start_imsi[3:5] if start_imsi[5:6].isdigit() else start_imsi[3:6]  # Mobile Network Code
            
            return {
                "start": start_imsi,
                "end": end_imsi,
                "count": imsi_count,
                "mcc": mcc,
                "mnc": mnc,
                "range": imsi_range,
                "valid": True
            }
            
        except Exception as e:
            logging.error(f"IMSI Range processing error: {str(e)}")
            return {
                "range": imsi_range,
                "valid": False,
                "error": str(e)
            }

    def _process_authentication_keys(self, imsi, auth_config):
        """Process authentication keys based on configuration"""
        method = auth_config.get('method', 'auto')
        
        if method == 'shared':
            # Use shared keys for all subscribers
            k = auth_config.get('k') or '465B5CE8B199B49FAA5F0A2EE238A6BC'
            opc = auth_config.get('opc') or 'E8ED289DEBA952E4283B54E88E6183CA'
            return k, opc
            
        elif method == 'pattern':
            # Generate keys using pattern
            pattern = auth_config.get('pattern', 'imsi_derived')
            base_k = auth_config.get('base_k')
            base_opc = auth_config.get('base_opc')
            
            if pattern == 'imsi_derived':
                k = self._derive_key_from_imsi(imsi, base_k) if base_k else self._generate_imsi_derived_key(imsi)
                opc = self._derive_key_from_imsi(imsi, base_opc, offset=1) if base_opc else self._generate_imsi_derived_opc(imsi)
            elif pattern == 'sequential':
                k = self._generate_sequential_key(imsi, base_k) if base_k else self._generate_security_key()
                opc = self._generate_sequential_key(imsi, base_opc, is_opc=True) if base_opc else self._generate_opc_key()
            else:
                # operator_specific or fallback
                k = self._generate_operator_specific_key(imsi, base_k) if base_k else self._generate_security_key()
                opc = self._generate_operator_specific_key(imsi, base_opc, is_opc=True) if base_opc else self._generate_opc_key()
                
            return k, opc
            
        else:
            # Auto-generate random keys (default behavior)
            return self._generate_security_key(), self._generate_opc_key()

    def _derive_key_from_imsi(self, imsi, base_key, offset=0):
        """Derive a key from IMSI using base key"""
        import hashlib
        # Combine IMSI with base key and offset for deterministic generation
        data = f"{imsi}{base_key}{offset}".encode('utf-8')
        hash_obj = hashlib.sha256(data)
        return hash_obj.hexdigest()[:32].upper()

    def _generate_imsi_derived_key(self, imsi):
        """Generate key directly from IMSI"""
        import hashlib
        # Use IMSI and a fixed salt for K key generation
        data = f"{imsi}_K_NASP_2024".encode('utf-8')
        hash_obj = hashlib.sha256(data)
        return hash_obj.hexdigest()[:32].upper()

    def _generate_imsi_derived_opc(self, imsi):
        """Generate OPc key directly from IMSI"""
        import hashlib
        # Use IMSI and a different salt for OPc key generation
        data = f"{imsi}_OPC_NASP_2024".encode('utf-8')
        hash_obj = hashlib.sha256(data)
        return hash_obj.hexdigest()[:32].upper()

    def _generate_sequential_key(self, imsi, base_key, is_opc=False):
        """Generate sequential key from base"""
        try:
            # Extract the last 8 digits of IMSI as sequence number
            imsi_suffix = int(imsi[-8:])
            base_int = int(base_key, 16)
            
            # Add sequence offset (different for K and OPc)
            offset = imsi_suffix * (2 if is_opc else 1)
            new_key_int = (base_int + offset) % (2**128)  # Keep within 128-bit range
            
            return f"{new_key_int:032X}"
        except:
            # Fallback to random generation
            return self._generate_opc_key() if is_opc else self._generate_security_key()

    def _generate_operator_specific_key(self, imsi, base_key, is_opc=False):
        """Generate operator-specific key (can be customized per operator)"""
        import hashlib
        # Extract MCC/MNC from IMSI (first 5-6 digits)
        mcc_mnc = imsi[:6]  # Assuming 3-digit MCC + 3-digit MNC
        
        # Operator-specific derivation
        operator_salt = "OPC_OP" if is_opc else "K_OP"
        data = f"{mcc_mnc}{base_key}{operator_salt}_{imsi}".encode('utf-8')
        hash_obj = hashlib.sha256(data)
        return hash_obj.hexdigest()[:32].upper()

    def extract_slice_config_from_nsi(self, nsi_data):
        """Extract slice configuration from NSI data for subscriber creation"""
        try:
            slice_configs = []
            
            # Extract S-NSSAI from the main NSI data
            s_nssai = nsi_data.get("S_NSSAI", "")
            main_sst = None
            main_sd = None
            
            if s_nssai:
                # Parse S-NSSAI (format: "1274414" -> SST=1, SD=274414)
                # S-NSSAI format: First digit is SST, remaining digits are SD
                if len(s_nssai) >= 1:
                    main_sst = int(s_nssai[0])
                    if len(s_nssai) > 1:
                        main_sd = int(s_nssai[1:])  # Convert to int for consistency
            
            # Extract QoS parameters from slice attributes
            qos_params = self._extract_qos_parameters(nsi_data)
            
            # Create subscriber slice configurations
            if main_sst:
                slice_config = {
                    "sst": main_sst,
                    "sd": str(main_sd or "123456"),
                    "default_indicator": True,
                    "session": [self._create_session_config(nsi_data, qos_params)]
                }
                slice_configs.append(slice_config)
                logging.info(f"Created slice config: SST={slice_config['sst']}, SD={slice_config['sd']}")
            
            # If no slices configured, create default
            if not slice_configs:
                slice_configs.append({
                    "sst": 1,
                    "sd": "123456",
                    "default_indicator": True,
                    "session": [self._create_session_config(nsi_data, qos_params)]
                })
            
            return slice_configs
            
        except Exception as e:
            logging.error(f"Error extracting slice config from NSI data: {str(e)}")
            # Return default configuration
            return [{
                "sst": 1,
                "sd": "123456", 
                "default_indicator": True,
                "session": [self._create_session_config(nsi_data, {})]
            }]

    def _extract_qos_parameters(self, nsi_data):
        """Extract QoS parameters from NSI data"""
        try:
            slice_attrs = nsi_data.get("description", {}).get("Slice Attributes", {})
            ssq = slice_attrs.get("SSQ", {})
            
            return {
                "guaranteed_downlink": ssq.get("Guaranteed Flow Bit Rate - Downlink", 1000000000),
                "guaranteed_uplink": ssq.get("Guaranteed Flow Bit Rate - Uplink", 1000000000),
                "max_downlink": ssq.get("Max Flow Bit Rate - Downlink", 1000000000),
                "max_uplink": ssq.get("Max Flow Bit Rate - Uplink", 1000000000),
                "priority_level": ssq.get("Priority Level", 8),
                "packet_delay_budget": ssq.get("Packet Delay Budget", 0.00012),
                "packet_error_rate": ssq.get("Packet Error Rate", 1e-07),
                "max_packet_loss_rate": ssq.get("Maximum Packet Loss Rate", 100000)
            }
        except Exception as e:
            logging.error(f"Error extracting QoS parameters: {str(e)}")
            return {}

    def _create_session_config(self, nsi_data, qos_params):
        """Create session configuration for subscriber slice"""
        try:
            # Get supported DNN from AMF config (default to "oranbr")
            dnn = "oranbr"  # default
            
            # Map QoS parameters to 5G QoS indexes
            qos_index = self._map_qos_to_index(qos_params)
            priority_level = qos_params.get("priority_level", 8)
            
            # Calculate AMBR values from QoS parameters
            downlink_ambr = qos_params.get("guaranteed_downlink", 1000000000)
            uplink_ambr = qos_params.get("guaranteed_uplink", 1000000000)
            
            session_config = {
                "name": dnn,
                "type": 3,  # IPv4
                "qos": {
                    "index": qos_index,
                    "arp": {
                        "priority_level": priority_level,
                        "pre_emption_capability": 1,
                        "pre_emption_vulnerability": 2
                    }
                },
                "ambr": {
                    "downlink": {"value": int(downlink_ambr), "unit": 0},
                    "uplink": {"value": int(uplink_ambr), "unit": 0}
                },
                "pcc_rule": []
            }
            
            return session_config
            
        except Exception as e:
            logging.error(f"Error creating session config: {str(e)}")
            # Return default session config
            return {
                "name": "oranbr",
                "type": 3,
                "qos": {
                    "index": 9,
                    "arp": {
                        "priority_level": 8,
                        "pre_emption_capability": 1,
                        "pre_emption_vulnerability": 2
                    }
                },
                "ambr": {
                    "downlink": {"value": 1000000000, "unit": 0},
                    "uplink": {"value": 1000000000, "unit": 0}
                },
                "pcc_rule": []
            }

    def _map_qos_to_index(self, qos_params):
        """Map QoS parameters to 5G QoS Class Identifier (QCI)"""
        # Simple mapping based on priority level
        priority = qos_params.get("priority_level", 8)
        
        # Map priority to QCI (simplified)
        if priority <= 2:
            return 5  # IMS Signalling
        elif priority <= 4:
            return 1  # Conversational Voice
        elif priority <= 6:
            return 7  # Video (Live Streaming)
        else:
            return 9  # Background

    def get_subscribers_by_imsi_range(self, start_imsi, end_imsi):
        """Retrieve Open5GS user CRs that fall within an IMSI range"""
        try:
            start_num = int(start_imsi)
            end_num = int(end_imsi)
            success, output = self._run_kubectl(["get", "open5gsusers", "-o", "json"])
            if not success or not output:
                return []
            data = json.loads(output)
            items = data.get("items", [])
            results = []
            for item in items:
                imsi = item.get("spec", {}).get("imsi")
                if not imsi:
                    continue
                imsi_num = int(imsi)
                if start_num <= imsi_num <= end_num:
                    results.append({
                        "name": item.get("metadata", {}).get("name"),
                        "imsi": imsi,
                        "sst": item.get("spec", {}).get("sst"),
                        "sd": item.get("spec", {}).get("sd"),
                        "apn": item.get("spec", {}).get("apn"),
                        "labels": item.get("metadata", {}).get("labels", {})
                    })
            return results
        except Exception as e:
            logging.error(f"Error retrieving Open5GS users: {str(e)}")
            return []

    def delete_subscribers_by_imsi_range(self, start_imsi, end_imsi):
        """Delete Open5GS user CRs within an IMSI range"""
        try:
            start_num = int(start_imsi)
            end_num = int(end_imsi)
            deleted = 0
            for imsi_num in range(start_num, end_num + 1):
                imsi = str(imsi_num).zfill(15)
                if self._delete_open5gs_user(imsi):
                    deleted += 1
            logging.info(f"Deleted {deleted} Open5GS users across IMSI range {start_imsi}-{end_imsi}")
            return True
        except Exception as e:
            logging.error(f"Error deleting Open5GS users: {str(e)}")
            return False

    def _generate_security_key(self):
        """Generate a random 32-character hexadecimal security key"""
        return ''.join(random.choices('0123456789ABCDEF', k=32))

    def _generate_opc_key(self):
        """Generate a random 32-character hexadecimal OPc key"""
        return ''.join(random.choices('0123456789ABCDEF', k=32))

    def delete_nsi(self, request):
        """Delete Network Slice Instance"""
        try:
            # Extract S_NSSAI from either URL path or request body
            s_nssai = None
            
            # Try to get from Flask's g object (when passed via URL path)
            try:
                from flask import g
                if hasattr(g, 'snssai'):
                    s_nssai = g.snssai
            except:
                pass
            
            # Try to get from URL path (if passed as parameter)
            if not s_nssai and hasattr(request, 'view_args') and request.view_args:
                s_nssai = request.view_args.get('snssai')
            
            # Try to get from request JSON body
            if not s_nssai and request.is_json:
                s_nssai = request.json.get('s_nssai') or request.json.get('S_NSSAI')
            
            # Try to get from query parameters
            if not s_nssai:
                s_nssai = request.args.get('s_nssai') or request.args.get('S_NSSAI')
            
            if not s_nssai:
                return {"error": "S_NSSAI parameter is required"}, 400
            
            logging.info(f"Attempting to delete NSI with S_NSSAI: {s_nssai}")
            
            # Load current NSI data
            try:
                with open("../data/db/nsi.json", "r", encoding="utf-8") as data_file:
                    nsi_list = json.load(data_file)
            except FileNotFoundError:
                logging.warning("NSI data file not found")
                return {"error": "NSI data not found"}, 404
            except json.JSONDecodeError:
                logging.error("Invalid JSON in NSI data file")
                return {"error": "Invalid NSI data format"}, 500
            
            # Find and remove the NSI with matching S_NSSAI
            original_count = len(nsi_list)
            nsi_list = [nsi for nsi in nsi_list if nsi.get('S_NSSAI') != s_nssai]
            
            if len(nsi_list) == original_count:
                logging.warning(f"NSI with S_NSSAI {s_nssai} not found")
                return {"error": f"NSI with S_NSSAI {s_nssai} not found"}, 404
            
            # Save updated NSI list
            with open("../data/db/nsi.json", "w", encoding="utf-8") as data_file:
                json.dump(nsi_list, data_file, indent=2)
            
            # Clean up related resources (subscribers, etc.)
            self._cleanup_nsi_resources(s_nssai)
            
            logging.info(f"Successfully deleted NSI with S_NSSAI: {s_nssai}")
            return {"message": f"NSI {s_nssai} deleted successfully", "S_NSSAI": s_nssai}, 200
            
        except Exception as exception:
            logging.error(f"Error deleting NSI: {str(exception)}")
            return {"error": f"Failed to delete NSI: {str(exception)}"}, 500
    
    def _cleanup_nsi_resources(self, s_nssai):
        """Clean up Kubernetes resources associated with a deleted NSI"""
        try:
            label_selector = f"nasp.slice={s_nssai}"
            self._delete_open5gs_users_by_label(label_selector)
            logging.info(f"Resource cleanup completed for NSI {s_nssai}")
        except Exception as e:
            logging.warning(f"Error during resource cleanup for NSI {s_nssai}: {str(e)}")
