import requests
import logging
import time
from flask import request, render_template
from src.services.ControllerKeyService import ControllerKeyService
# from src.services.NsmfService import NsmfService
from src.services.nsmf_service import NsmfService


def configure(app):
    """Configure App Routes"""
    nasp_ui(app)
    nsmf(app)

def nasp_ui(app):
    """NASP UI"""
    @app.route('/webhook', methods=['PUT'])
    def webhook_put():
        print(request.get_json())
        return "ok"
    @app.route('/webhook', methods=['POST'])
    def webhook_post():
        print(request.get_json())
        return "ok"
    @app.route('/')
    def index():
        logging.info("NST")
        response = requests.get("http://localhost:5000/nasp/nst", timeout=100)
        logging.info(response.json())
        return render_template("nst.html",use_cases = response.json(), role=request.args.get('role'))

    @app.route('/catalog')
    def catalog():
        response = requests.get("http://localhost:5000/nasp/nst", timeout=100)
        return render_template("catalog.html",use_cases = response.json(), role=request.args.get('role'))

    @app.route('/dashboard-topology')
    def topology():
        return render_template("dashboard-topology.html", nssai = 1, role=request.args.get('role'))
    @app.route('/dashboard-metrics')
    def metrics():
        return render_template("dashboard-metrics.html", nssai = 1, role=request.args.get('role'))
    @app.route('/dashboard-logs')
    def logs():
        return render_template("dashboard-logs.html", nssai = 1, role=request.args.get('role'))
    @app.route('/dashboard-tracing')
    def tracing():
        return render_template("dashboard-tracing.html", nssai = 1, role=request.args.get('role'))


    @app.route('/nsi')
    def nsi():
        response = requests.get("http://localhost:5000/nasp/nsi", timeout=100)
        print(response.json())
        
        nsi_list = [{
            "s_nssai":"1274408",
            "name": "Demo 5G Network Slice",
            "description": "",
            "status": "provisioned",
            "is_shared": True
        },
        {
            "s_nssai":"1274401",
            "name": "Non3GPP Slice",
            "description": "",
            "status": "provisioning",
            "is_shared": True
        }]
        return render_template("nsi.html", nsi_list = response.json(), role=request.args.get('role'))


    @app.route('/status')
    def alive():
        try:
            # Check if NST and NSI endpoints are working
            nst_response = requests.get("http://localhost:5000/nasp/nst", timeout=5)
            nsi_response = requests.get("http://localhost:5000/nasp/nsi", timeout=5)
            
            return {
                "status": "healthy",
                "timestamp": time.time(),
                "services": {
                    "nst": "ok" if nst_response.status_code == 200 else "error",
                    "nsi": "ok" if nsi_response.status_code == 200 else "error"
                },
                "version": "5.1.3"
            }
        except Exception as e:
            return {
                "status": "error",
                "timestamp": time.time(),
                "error": str(e),
                "version": "5.1.3"
            }, 500

def nsmf(app):
    """
    NSMF
    """
    prefix = "/nasp"
    @app.route(f"{prefix}/controllerKey/", methods=['GET'])
    def get_controllerkey():
        try:
            controller = ControllerKeyService()
            return controller.getControllerKey(request)
        except Exception as exception:
            return str(exception), 500
            
    @app.route(f"{prefix}/controllerKey/", methods=['POST'])
    def put_controllerket():
        try:
            controller = ControllerKeyService()
            return controller.createControllerKey(request)
        except Exception as exception:
            return str(exception), 500

    @app.route(f"{prefix}/nst/", methods=['GET'])
    def get_nst():
        try:
            Nsmf = NsmfService()
            return Nsmf.get_all_nst(request)
        except Exception as exception:
            return str(exception), 500

    @app.route(f"{prefix}/nst/", methods=['PUT'])
    def add_nst():
        try:
            Nsmf = NsmfService()
            return Nsmf.add_nst(request)
        except Exception as exception:
            return str(exception), 500

    @app.route(f"{prefix}/nsi/", methods=['PUT'])
    def alloc_nsi():
        try:
            Nsmf = NsmfService()
            return Nsmf.allocNsi(request)
        except Exception as exception:
            return str(exception), 500

    @app.route(f"{prefix}/nsi/", methods=['GET'])
    def get_nsi():
        try:
            Nsmf = NsmfService()
            return Nsmf.getAllNsi(request)
        except Exception as exception:
            return str(exception), 500
        
    @app.route(f"{prefix}/nsi/", methods=['DELETE'])
    def delete_nsi():
        try:
            Nsmf = NsmfService()
            return Nsmf.delete_nsi(request)
        except Exception as exception:
            return str(exception), 500
    
    @app.route(f"{prefix}/clear/", methods=['GET'])
    def clear_environment():
        try:
            Nsmf = NsmfService()
            return Nsmf.clear_environment()
        except Exception as exception:
            return str(exception), 500

    @app.route(f"{prefix}/clear/", methods=['POST'])
    def clear_environment_post():
        try:
            Nsmf = NsmfService()
            return Nsmf.clear_environment()
        except Exception as exception:
            return str(exception), 500

    @app.route(f"{prefix}/subscribers/", methods=['GET'])
    def get_subscribers():
        """Get subscribers by IMSI range"""
        try:
            Nsmf = NsmfService()
            start_imsi = request.args.get('start_imsi')
            end_imsi = request.args.get('end_imsi')
            
            if start_imsi and end_imsi:
                subscribers = Nsmf.get_subscribers_by_imsi_range(start_imsi, end_imsi)
                return {"subscribers": subscribers, "count": len(subscribers)}
            else:
                return {"error": "start_imsi and end_imsi parameters required"}, 400
        except Exception as exception:
            return str(exception), 500

    @app.route(f"{prefix}/subscribers/", methods=['DELETE'])
    def delete_subscribers():
        """Delete subscribers by IMSI range"""
        try:
            Nsmf = NsmfService()
            start_imsi = request.json.get('start_imsi')
            end_imsi = request.json.get('end_imsi')
            
            if start_imsi and end_imsi:
                success = Nsmf.delete_subscribers_by_imsi_range(start_imsi, end_imsi)
                return {"success": success}
            else:
                return {"error": "start_imsi and end_imsi required in request body"}, 400
        except Exception as exception:
            return str(exception), 500

    @app.route(f"{prefix}/test-auth-keys/", methods=['POST'])
    def test_auth_keys():
        """Test authentication key generation for a given IMSI and configuration"""
        try:
            Nsmf = NsmfService()
            imsi = request.json.get('imsi')
            auth_config = request.json.get('auth_config', {})
            
            if not imsi:
                return {"error": "IMSI required"}, 400
            
            if not auth_config.get('method'):
                auth_config['method'] = 'auto'
            
            k, opc = Nsmf._process_authentication_keys(imsi, auth_config)
            
            return {
                "imsi": imsi,
                "auth_method": auth_config.get('method'),
                "keys": {
                    "k": k,
                    "opc": opc
                },
                "test_only": True
            }
        except Exception as exception:
            return str(exception), 500

