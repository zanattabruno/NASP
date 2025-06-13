import os
import logging
import json

class NssmfRANService():
    """Nssmf Ran Class"""
    
    def get_all_nsst(self, request):
        """Get All NSST"""
        try:
            data = open("../data/db/nsst_ran.json", encoding="utf-8")
            try:
                return json.load(data)
            except Exception as exception:
                print(str(exception))
                return []
        except Exception as exception:
            return f"Bad Request {exception}", 400

    def add_nsst(self, request):
        """Get All NSSTs Core"""
        print(request)
        try:
            data = open("../data/db/nsst_ran.json", encoding="utf-8")
            try:
                nsst_list = json.load(data)
            except Exception as exception:
                print(str(exception))
                nsst_list = []
                
            nsst_list.append({
                "domain": request.json.get("domain"),
                "name": request.json.get("name"),
                "description": request.json.get("description"),
                "id": "1",
                "status": "Ready",
                "is_shared": True,
                "path": "../helm_charts/core/free5gc"
            })
            f = open("../data/db/nsst_ran.json", "w", encoding="utf-8")
            print(type(nsst_list[0]))
            f.write(json.dumps(nsst_list))
            f.close()
            return data
        except Exception as exception:
            return f"Bad Request - {exception}", 400
