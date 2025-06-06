import os
import logging
import time
import json
import requests
import time
import random
import subprocess
from pymongo import MongoClient


class NsmfService():
    """Nsmf Service Class"""
    
    # MongoDB Configuration
    MONGO_CONFIG = {
        "host": "192.168.86.40",  # Kubernetes service
        "port": 27017,
        "database": "open5gs",
        "collection": "subscribers",
        # Fallback to localhost for local development
        "fallback_host": "localhost"
    }
    
    # rApp Configuration
    RAPP_CONFIG = {
        "base_url": "http://10.107.249.103",
        "endpoints": {
            "create_slice_policy": "/create_slice_policy"
        }
    }
    
    def __init__(self):
        """Initialize MongoDB connection"""
        self.mongo_client = None
        self.mongo_db = None
        self.subscribers_collection = None
        self._init_mongo_connection()
    
    def _init_mongo_connection(self):
        """Initialize MongoDB connection with fallback options"""
        connection_attempts = [
            {
                "host": self.MONGO_CONFIG["host"],
                "port": self.MONGO_CONFIG["port"],
                "desc": "Kubernetes service"
            },
            {
                "host": self.MONGO_CONFIG.get("fallback_host", "localhost"),
                "port": self.MONGO_CONFIG["port"],
                "desc": "localhost fallback"
            }
        ]
        
        for attempt in connection_attempts:
            try:
                logging.info(f"Attempting MongoDB connection to {attempt['desc']}: {attempt['host']}:{attempt['port']}")
                
                # Create MongoDB client with shorter timeout for faster fallback
                self.mongo_client = MongoClient(
                    host=attempt["host"],
                    port=attempt["port"],
                    serverSelectionTimeoutMS=5000,  # 5 second timeout
                    connectTimeoutMS=5000
                )
                
                # Get database and collection
                self.mongo_db = self.mongo_client[self.MONGO_CONFIG["database"]]
                self.subscribers_collection = self.mongo_db[self.MONGO_CONFIG["collection"]]
                
                # Test connection
                self.mongo_client.admin.command('ping')
                logging.info(f"MongoDB connection established successfully to {attempt['desc']}")
                return
                
            except Exception as e:
                logging.warning(f"Failed to connect to MongoDB at {attempt['desc']}: {str(e)}")
                if self.mongo_client:
                    self.mongo_client.close()
                    self.mongo_client = None
                continue
        
        # All connection attempts failed
        logging.error("All MongoDB connection attempts failed")
        self.mongo_client = None
        self.mongo_db = None
        self.subscribers_collection = None

    def allocNsi(self, req):
        """Get All NSSTs Core"""
        try:
            logging.info("allocNSI")
            
            # Generate S_NSSAI first
            S_NSSAI = "1"+f"2744{int(random.random()*100)}"
            logging.info(f"S_NSSAI Selected = {S_NSSAI}")
            
            # Process IMSI Range data
            imsi_range = req.json.get("imsi_range", "")
            imsi_data = {}
            
            if imsi_range:
                logging.info(f"Processing IMSI Range: {imsi_range}")
                imsi_data = self.process_imsi_range(imsi_range)
                logging.info(f"IMSI Data processed: {imsi_data}")
                
                # Create subscribers in MongoDB based on IMSI range
                if imsi_data.get("valid", False):
                    logging.info("Creating subscribers in MongoDB")
                    # Create complete NSI data for slice extraction
                    nsi_data_for_subscribers = {
                        "S_NSSAI": S_NSSAI,
                        "imsi_data": imsi_data,
                        "description": req.json.get("description", {}),
                        "resource_description": req.json.get("resource_description", {})
                    }
                    
                    success = self.create_subscribers_from_nsi_data(nsi_data_for_subscribers)
                    if success:
                        logging.info("Subscribers created successfully in MongoDB")
                    else:
                        logging.error("Failed to create subscribers in MongoDB")
                else:
                    logging.error("Invalid IMSI data, skipping subscriber creation")
            
            # Include IMSI data in the stored information
            data = {
                "name": req.json["name"], 
                "description": req.json["description"], 
                "S_NSSAI": S_NSSAI,
                "imsi_range": imsi_range,
                "imsi_data": imsi_data
            }
            
            logging.info(data)
            # Added url to post data to rAppNASP
            rapp_url = f"{self.RAPP_CONFIG['base_url']}{self.RAPP_CONFIG['endpoints']['create_slice_policy']}"
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
        try:
            response = requests.post(url, json=data)
            response.raise_for_status()
        except Exception as exception:
            print(str(exception))

    def add_to_db(self, data, table, url):
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
        self.clear_all_subscribers()  # Clear subscribers from MongoDB
        try:
            open("../data/db/nsi.json", "w", encoding="utf-8").write("[]")
            return f"Environment Cleared", 200
        except Exception as exception:
            return f"Bad Request - {exception}", 400



    def delete_delay(self):
        cmd_list = [f'ssh 127.0.0.1 "tc qdisc del dev eth1 parent 1:1"',
                    f'ssh 127.0.0.1 "tc qdisc del dev eth1 parent 1:1"']
        for cmd in cmd_list:
            try:
                result = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT)
                return result.decode('utf-8')
            except Exception as exception:
                continue
                raise Exception(exception.output.decode('utf-8'))

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

    def create_subscriber_document(self, imsi, slice_configs=None):
        """Create a subscriber document for MongoDB"""
        try:
            # Generate random security keys
            k = self._generate_security_key()
            opc = self._generate_opc_key()
            
            # Default slice configuration if none provided
            if not slice_configs:
                slice_configs = [{
                    "sst": 1,
                    "sd": "123456",
                    "default_indicator": True,
                    "session": [{
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
                    }]
                }]
            
            subscriber_doc = {
                "schema_version": 1,
                "imsi": imsi,
                "msisdn": [],
                "imeisv": self._generate_imeisv(),
                "mme_host": [],
                "mm_realm": [],
                "purge_flag": [],
                "slice": slice_configs,
                "security": {
                    "k": k,
                    "op": None,
                    "opc": opc,
                    "amf": "8000",
                    "sqn": 0
                },
                "ambr": {
                    "downlink": {"value": 1000000000, "unit": 0},
                    "uplink": {"value": 1000000000, "unit": 0}
                },
                "access_restriction_data": 32,
                "network_access_mode": 0,
                "subscribed_rau_tau_timer": 12,
                "__v": 0
            }
            
            return subscriber_doc
            
        except Exception as e:
            logging.error(f"Error creating subscriber document: {str(e)}")
            return None

    def create_subscribers_from_imsi_range(self, imsi_data, slice_configs=None):
        """Create subscribers in MongoDB from IMSI range data"""
        try:
            if self.subscribers_collection is None:
                logging.error("MongoDB connection not available")
                return False
                
            if not imsi_data.get("valid", False):
                logging.error("Invalid IMSI data provided")
                return False
            
            start_imsi = int(imsi_data["start"])
            end_imsi = int(imsi_data["end"])
            created_count = 0
            
            logging.info(f"Creating subscribers for IMSI range: {imsi_data['start']} to {imsi_data['end']}")
            
            # Create subscribers for each IMSI in the range
            for imsi_num in range(start_imsi, end_imsi + 1):
                imsi = str(imsi_num).zfill(15)  # Ensure 15 digits
                
                # Check if subscriber already exists
                if self.subscribers_collection.find_one({"imsi": imsi}):
                    logging.info(f"Subscriber with IMSI {imsi} already exists, skipping")
                    continue
                
                # Create subscriber document with slice configs
                subscriber_doc = self.create_subscriber_document(imsi, slice_configs)
                
                if subscriber_doc:
                    try:
                        # Insert into MongoDB
                        result = self.subscribers_collection.insert_one(subscriber_doc)
                        if result.inserted_id:
                            created_count += 1
                            logging.info(f"Created subscriber with IMSI: {imsi}")
                        else:
                            logging.error(f"Failed to create subscriber with IMSI: {imsi}")
                    except Exception as e:
                        logging.error(f"Error inserting subscriber {imsi}: {str(e)}")
                        continue
            
            logging.info(f"Successfully created {created_count} subscribers")
            return True
            
        except Exception as e:
            logging.error(f"Error creating subscribers from IMSI range: {str(e)}")
            return False

    def create_subscribers_from_nsi_data(self, nsi_data):
        """Create subscribers from NSI data with extracted slice configuration"""
        try:
            # Extract IMSI range data
            imsi_data = nsi_data.get("imsi_data", {})
            
            if not imsi_data.get("valid", False):
                logging.error("No valid IMSI data found in NSI")
                return False
            
            # Extract slice configuration from NSI data
            slice_configs = self.extract_slice_config_from_nsi(nsi_data)
            
            logging.info(f"Extracted {len(slice_configs)} slice configurations from NSI data")
            for i, slice_config in enumerate(slice_configs):
                logging.info(f"Slice {i+1}: SST={slice_config.get('sst')}, SD={slice_config.get('sd')}")
            
            # Create subscribers with the extracted slice configuration
            return self.create_subscribers_from_imsi_range(imsi_data, slice_configs)
            
        except Exception as e:
            logging.error(f"Error creating subscribers from NSI data: {str(e)}")
            return False

    def get_subscribers_by_imsi_range(self, start_imsi, end_imsi):
        """Retrieve subscribers within an IMSI range"""
        try:
            if self.subscribers_collection is None:
                logging.error("MongoDB connection not available")
                return []
            
            # Query for subscribers within the IMSI range
            subscribers = list(self.subscribers_collection.find({
                "imsi": {
                    "$gte": start_imsi,
                    "$lte": end_imsi
                }
            }))
            
            return subscribers
            
        except Exception as e:
            logging.error(f"Error retrieving subscribers: {str(e)}")
            return []

    def delete_subscribers_by_imsi_range(self, start_imsi, end_imsi):
        """Delete subscribers within an IMSI range"""
        try:
            if self.subscribers_collection is None:
                logging.error("MongoDB connection not available")
                return False
            
            # Delete subscribers within the IMSI range
            result = self.subscribers_collection.delete_many({
                "imsi": {
                    "$gte": start_imsi,
                    "$lte": end_imsi
                }
            })
            
            logging.info(f"Deleted {result.deleted_count} subscribers")
            return True
            
        except Exception as e:
            logging.error(f"Error deleting subscribers: {str(e)}")
            return False

    def _generate_security_key(self):
        """Generate a random 32-character hexadecimal security key"""
        return ''.join(random.choices('0123456789ABCDEF', k=32))

    def _generate_opc_key(self):
        """Generate a random 32-character hexadecimal OPc key"""
        return ''.join(random.choices('0123456789ABCDEF', k=32))

    def _generate_imeisv(self):
        """Generate a random 16-digit IMEISV"""
        return ''.join(random.choices('0123456789', k=16))

    def close_mongo_connection(self):
        """Close MongoDB connection"""
        if self.mongo_client:
            self.mongo_client.close()
            logging.info("MongoDB connection closed")

    def clear_all_subscribers(self):
        """Clear all subscribers from MongoDB collection"""
        try:
            if self.subscribers_collection is None:
                logging.error("MongoDB connection not available")
                return False
            
            # Delete all documents in the subscribers collection
            result = self.subscribers_collection.delete_many({})
            logging.info(f"Cleared {result.deleted_count} subscribers from MongoDB")
            return True
            
        except Exception as e:
            logging.error(f"Error clearing subscribers: {str(e)}")
            return False

    def extract_slice_config_from_nsi(self, nsi_data):
        """Extract slice configuration from NSI data for subscriber creation"""
        try:
            # First validate slice consistency
            is_consistent, inconsistencies = self.validate_slice_consistency(nsi_data)
            if not is_consistent:
                logging.warning(f"Proceeding with slice extraction despite inconsistencies: {inconsistencies}")
            
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
            
            # Extract PLMN and slice info from resource description
            resource_desc = nsi_data.get("description", {}).get("resource_description", {})
            
            # Get slice configurations from AMF config
            amf_slices = self._extract_amf_slice_config(resource_desc)
            logging.info(f"AMF slices extracted: {amf_slices}")
            
            # Get slice configurations from RAN config  
            ran_slices = self._extract_ran_slice_config(resource_desc)
            logging.info(f"RAN slices extracted: {ran_slices}")
            logging.info(f"Main S-NSSAI parsed - SST: {main_sst}, SD: {main_sd}")
            
            # Combine all slice configurations
            all_slices = []
            
            # Add AMF slices
            all_slices.extend(amf_slices)
            
            # Add RAN slices if not already present
            for ran_slice in ran_slices:
                if not any(s.get("sst") == ran_slice.get("sst") and 
                          s.get("sd") == ran_slice.get("sd") for s in all_slices):
                    all_slices.append(ran_slice)
            
            # Only use main S-NSSAI if no slices found in network configuration
            # This ensures actual network config takes priority
            if not all_slices and main_sst:
                logging.warning(f"No slices found in AMF/RAN config, falling back to S-NSSAI: SST={main_sst}, SD={main_sd}")
                all_slices.append({
                    "sst": main_sst,
                    "sd": main_sd or "123456"
                })
            
            logging.info(f"Final combined slices: {all_slices}")
            
            # Create subscriber slice configurations
            for slice_info in all_slices:
                # Keep SD values as strings (no hex conversion needed)
                sd_value = slice_info.get("sd", "123456")
                
                slice_config = {
                    "sst": slice_info.get("sst", 1),
                    "sd": str(sd_value),
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

    def _extract_amf_slice_config(self, resource_desc):
        """Extract slice configuration from AMF resource description"""
        try:
            slices = []
            core_nfs = resource_desc.get("core", {}).get("nfs", [])
            
            for nf in core_nfs:
                if nf.get("name") == "amf":
                    config = nf.get("config", {})
                    plmn_support_list = config.get("plmnSupportList", [])
                    
                    for plmn_support in plmn_support_list:
                        snssai_list = plmn_support.get("snssaiList", [])
                        for snssai in snssai_list:
                            slices.append({
                                "sst": snssai.get("sst", 1),
                                "sd": snssai.get("sd", "123456")
                            })
            
            return slices
        except Exception as e:
            logging.error(f"Error extracting AMF slice config: {str(e)}")
            return []

    def _extract_ran_slice_config(self, resource_desc):
        """Extract slice configuration from RAN resource description"""
        try:
            slices = []
            ran_nfs = resource_desc.get("ran", {}).get("nfs", [])
            
            for nf in ran_nfs:
                if nf.get("type") == "gnb":
                    config = nf.get("config", {})
                    slice_list = config.get("slices", [])
                    
                    for slice_info in slice_list:
                        slices.append({
                            "sst": slice_info.get("sst", 1),
                            "sd": slice_info.get("sd", "123456")
                        })
            
            return slices
        except Exception as e:
            logging.error(f"Error extracting RAN slice config: {str(e)}")
            return []

    def _create_session_config(self, nsi_data, qos_params):
        """Create session configuration for subscriber slice"""
        try:
            # Get supported DNN from AMF config
            dnn = "internet"  # default
            resource_desc = nsi_data.get("description", {}).get("resource_description", {})
            core_nfs = resource_desc.get("core", {}).get("nfs", [])
            
            for nf in core_nfs:
                if nf.get("name") == "amf":
                    config = nf.get("config", {})
                    support_dnn_list = config.get("supportDnnList", [])
                    if support_dnn_list:
                        dnn = support_dnn_list[0]
                    break
            
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
        try:
            priority = qos_params.get("priority_level", 8)
            
            # Map priority levels to QoS indexes based on 5G standards
            if priority <= 2:
                return 1  # GBR - Conversational Voice
            elif priority <= 4:
                return 5  # GBR - Video
            elif priority <= 6:
                return 7  # GBR - Gaming
            elif priority <= 8:
                return 9  # Non-GBR - Default
            else:
                return 9  # Default
                
        except Exception:
            return 9  # Default QoS index
    
    def validate_slice_consistency(self, nsi_data):
        """Validate consistency between S-NSSAI and network configuration"""
        try:
            s_nssai = nsi_data.get("S_NSSAI", "")
            resource_desc = nsi_data.get("description", {}).get("resource_description", {})
            
            # Extract slices from network configuration
            amf_slices = self._extract_amf_slice_config(resource_desc)
            ran_slices = self._extract_ran_slice_config(resource_desc)
            
            # Parse S-NSSAI
            main_sst = None
            main_sd = None
            if s_nssai and len(s_nssai) >= 1:
                main_sst = int(s_nssai[0])
                if len(s_nssai) > 1:
                    main_sd = int(s_nssai[1:])
            
            # Check for inconsistencies
            inconsistencies = []
            
            if main_sst and main_sd:
                # Check if S-NSSAI matches any AMF slice
                amf_match = any(s.get("sst") == main_sst and s.get("sd") == main_sd for s in amf_slices)
                # Check if S-NSSAI matches any RAN slice  
                ran_match = any(s.get("sst") == main_sst and s.get("sd") == main_sd for s in ran_slices)
                
                if not amf_match and not ran_match:
                    inconsistencies.append(f"S-NSSAI ({main_sst}, {main_sd}) not found in AMF or RAN configuration")
            
            # Check if AMF and RAN slices are consistent
            for amf_slice in amf_slices:
                ran_match = any(r.get("sst") == amf_slice.get("sst") and r.get("sd") == amf_slice.get("sd") for r in ran_slices)
                if not ran_match:
                    inconsistencies.append(f"AMF slice ({amf_slice.get('sst')}, {amf_slice.get('sd')}) not found in RAN configuration")
            
            if inconsistencies:
                logging.warning(f"Slice configuration inconsistencies found: {inconsistencies}")
                return False, inconsistencies
            else:
                logging.info("Slice configuration is consistent")
                return True, []
                
        except Exception as e:
            logging.error(f"Error validating slice consistency: {str(e)}")
            return False, [f"Validation error: {str(e)}"]
