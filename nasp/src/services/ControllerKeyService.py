import pymongo


class ControllerKeyService():

    def getControllerKey(self, request):
        try:
            myclient = pymongo.MongoClient("mongodb://root:example@localhost:27017/")
            db = myclient["db_example"]
            coll = db["kube"]
            myquery = { "apiVersion": "v1" }
            mydoc = coll.find(myquery)
            kube = mydoc[0]
            del kube['_id']
            return kube
        except Exception:
            return "Id não encontrado", 400

    def createControllerKey(self, request):
        try:
            client = pymongo.MongoClient("mongodb://root:example@localhost:27017/")
            print(client.list_database_names())
            db = client.db_example
            coll = db.kube
            coll.insert_one(request.json)
        except Exception as e:
            return str(e), 400
        return 'OK'