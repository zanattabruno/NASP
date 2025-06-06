import os
import json
import logging

class NssmfCoreService():
    """Nssmf Core Class"""
    def alloc_nssi(self, request):
        """"Alloc NSSI Core"""
        try:
            NSSAI = request.json['S-NSSAI']
            name = request.json['name']
            path = ""
            data = open("../data/db/nsst_core.json", encoding="utf-8")
            for i in json.load(data):
                if i.get("name") == name:
                    path = i.get("path")

            commands = [
                f"kubectl create ns {NSSAI}",
                f"helm install db mongodb/ -n {NSSAI}",
                f"helm install nrf free5gc-nrf/ -n {NSSAI}",
                f"helm install amf free5gc-amf/ -n {NSSAI}",
                f"helm install ausf free5gc-ausf/ -n {NSSAI}",
                f"helm install nssf free5gc-nssf/ -n {NSSAI}",
                f"helm install pcf free5gc-pcf/ -n {NSSAI}",
                f"helm install smf free5gc-smf/ -n {NSSAI}",
                f"helm install udm free5gc-udm/ -n {NSSAI}",
                f"helm install udr free5gc-udr/ -n {NSSAI}",
                f"helm install upf free5gc-upf/ -n {NSSAI}",
                f"helm install webui free5gc-webui/ -n {NSSAI}"
            ]
            out = os.popen(";".join(commands))
            return "OK"
        except Exception as exception:
            logging.error(str(exception))
            return f"Bad Request - {exception}", 400

    def get_all_nssi(self, request):
        """Get All NSSI CORE"""
        try:
            output = os.popen("helm list -A").read()
            print(output.split("\n")[1:])
            deployed_list = output.split("\n")[1:]
            return [obj.split("\t")[0] for obj in deployed_list]
        except Exception:
            return "Bad Request", 400

    def get_all_nsst(self, request):
        """Get All NSSTs Core"""
        try:
            data = open("../data/db/nsst_core.json", encoding="utf-8")
            try:
                return json.load(data)
            except Exception as exception:
                print(str(exception))
                return []
        except Exception as exception:
            return f"Bad Request - {exception}", 400
    
    def add_nsst(self, request):
        """Get All NSSTs Core"""
        try:
            data = open("../data/db/nsst_core.json", encoding="utf-8")
            try:
                nsst_list = json.load(data)
            except Exception as exception:
                print(str(exception))
                nsst_list = []
            new_nsst = {
                "domain": request.json.get("domain"),
                "name": request.json.get("name"),
                "description": request.json.get("description"),
                "id": "1",
                "status": "Ready",
                "is_shared": True,
                "path": "../helm_charts/core/free5gc"
            }
            nsst_list.append(new_nsst)
            open("../data/db/nsst_core.json", "w", encoding="utf-8").write(json.dumps(nsst_list))
            return new_nsst
        except Exception as exception:
            return f"Bad Request - {exception}", 400

        