"""
SecureVault OS - Flask Application Entry Point
Assembles all blueprints, initializes extensions, creates the database,
starts the cleanup scheduler, and runs the development server.
"""

import os
import sys

# Ensure the server directory is on sys.path so relative imports work
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask
from config import config_map
from extensions import db, jwt, cors, init_redis


def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_map.get(config_name, config_map["default"]))

    # Ensure encrypted storage directory exists
    os.makedirs(app.config["ENCRYPTED_STORAGE_DIR"], exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    init_redis(app)

    # Register blueprints
    from routes.auth_routes import auth_bp
    from routes.file_routes import file_bp
    from routes.security_routes import security_bp
    from routes.admin_routes import admin_bp
    from routes.room_routes import room_bp
    from routes.version_routes import version_bp
    from routes.lock_routes import lock_bp
    from routes.chat_routes import chat_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(file_bp)
    app.register_blueprint(security_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(room_bp)
    app.register_blueprint(version_bp)
    app.register_blueprint(lock_bp)
    app.register_blueprint(chat_bp)

    # Create database tables
    with app.app_context():
        import models  # noqa: F401  — triggers model registration
        db.create_all()
        app.logger.info("Database tables created.")

    # Start background scheduler for expired file cleanup
    from scheduler.cleanup_scheduler import start_scheduler
    start_scheduler(app)

    # Health check endpoint
    @app.route("/api/health")
    def health():
        return {"status": "ok", "service": "SecureVault OS"}, 200

    return app


if __name__ == "__main__":
    app = create_app(os.environ.get("FLASK_ENV", "development"))
    app.run(host="0.0.0.0", port=5001, debug=True)
