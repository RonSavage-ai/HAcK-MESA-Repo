"""
Threaded backend bootstrap.

Supervisor is configured to run `uvicorn server:app`.
We hijack the import to exec into Node.js, which then binds port 8001.
"""
import os

os.environ["PORT"] = "8001"
os.execvp("node", ["node", os.path.join(os.path.dirname(__file__), "server.js")])
