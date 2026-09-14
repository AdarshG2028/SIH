#!/usr/bin/env python3
"""
SIH Prototype: Railway AI Block Planning REST API Server

Conforms to SIH Section 6 Specification:
Provides a stable, zero-dependency REST interface for backend and frontend developers.

Endpoints:
- POST /api/ai/generate-plan : Generates optimized multi-department block plan & KPIs
- POST /api/ai/priority      : Calculates 0–100 priority score and contributing factors
- POST /api/ai/what-if       : Simulates train conflicts and suggests alternative slots
- GET  /api/ai/kpis          : Returns Before vs After prototype evaluation metrics
- POST /api/ai/user-request  : Ingests user block form inputs (with duration, workers, equipment)
- GET  /api/health           : Health check endpoint
"""

import sys
import json
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ML.src.planning.priority_scoring_model import calculate_maintenance_priority
from ML.src.planning.what_if_simulator import simulate_what_if_block
from ML.src.planning.evaluation_metrics import compute_prototype_kpis
from ML.src.planning.block_planner import generate_sih_optimized_plan, evaluate_user_request


class RailwayAIRequestHandler(BaseHTTPRequestHandler):

    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "/api/health":
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "UP",
                "service": "Indian Railways Automatic Block Planning AI Engine",
                "version": "2.0-SIH"
            }).encode("utf-8"))
            return

        elif path == "/api/ai/kpis":
            self._set_headers(200)
            kpi_data = compute_prototype_kpis()
            self.wfile.write(json.dumps(kpi_data, indent=2).encode("utf-8"))
            return

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": f"Endpoint not found: {path}"}).encode("utf-8"))

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        
        try:
            body = json.loads(post_data) if post_data else {}
        except Exception:
            body = {}

        try:
            # 1. Generate Plan
            if path == "/api/ai/generate-plan":
                plan = generate_sih_optimized_plan(
                    planning_horizon=body.get("planning_horizon", "weekly"),
                    start_date=body.get("start_date", "2026-09-16"),
                    end_date=body.get("end_date", "2026-09-22"),
                    corridor=body.get("corridor"),
                    task_ids=body.get("task_ids")
                )
                self._set_headers(200)
                self.wfile.write(json.dumps(plan, indent=2).encode("utf-8"))
                return

            # 2. Priority Scoring
            elif path == "/api/ai/priority":
                priority_res = calculate_maintenance_priority(body)
                self._set_headers(200)
                self.wfile.write(json.dumps(priority_res, indent=2).encode("utf-8"))
                return

            # 3. What-If Simulation
            elif path == "/api/ai/what-if":
                what_if_res = simulate_what_if_block(
                    corridor=body.get("corridor", "LNL-PUNE"),
                    proposed_date=body.get("proposed_date", "2026-09-16"),
                    proposed_start_time=body.get("proposed_start_time", "10:30"),
                    proposed_end_time=body.get("proposed_end_time", "12:00"),
                    department=body.get("department", "Engineering"),
                    maintenance_type=body.get("maintenance_type", "Track Maintenance")
                )
                self._set_headers(200)
                self.wfile.write(json.dumps(what_if_res, indent=2).encode("utf-8"))
                return

            # 4. Interactive User Request (Form submission)
            elif path == "/api/ai/user-request":
                user_res = evaluate_user_request(body)
                self._set_headers(200)
                self.wfile.write(json.dumps(user_res, indent=2).encode("utf-8"))
                return

            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": f"Endpoint not found: {path}"}).encode("utf-8"))

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": "Internal AI Processing Error", "details": str(e)}).encode("utf-8"))


def run_server(port: int = 8000):
    server_address = ("", port)
    httpd = HTTPServer(server_address, RailwayAIRequestHandler)
    print("=" * 75)
    print(f"  INDIAN RAILWAYS AI BLOCK PLANNING API SERVER RUNNING ON PORT {port}")
    print("=" * 75)
    print(f"  • POST /api/ai/generate-plan  (Full optimized block schedule & KPIs)")
    print(f"  • POST /api/ai/priority       (0–100 Priority score & contributing factors)")
    print(f"  • POST /api/ai/what-if        (What-If train conflict simulator)")
    print(f"  • POST /api/ai/user-request   (Evaluates interactive user block forms)")
    print(f"  • GET  /api/ai/kpis           (Before vs After evaluation metrics)")
    print(f"  • GET  /api/health            (Service health check)")
    print("=" * 75)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping API server...")
        httpd.server_close()


if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
