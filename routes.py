from flask import send_from_directory

def flask_routes(app):
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def index(path):
        if path != "":
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, "index.html")