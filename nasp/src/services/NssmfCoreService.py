import os
import json
import logging

class NssmfCoreService():
    """Nssmf Core Class"""

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

        