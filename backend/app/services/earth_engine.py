"""Google Earth Engine authentication and initialization.

Uses Google account OAuth credentials stored locally by `earthengine authenticate`
(or Application Default Credentials on Cloud Run / Vertex AI), so no private
service-account key file is needed for local development.

Setup (one time, in your activated venv):

    pip install --upgrade earthengine-api google-auth
    earthengine authenticate            # opens browser, saves credentials
    earthengine set_project YOUR_PROJECT_ID

Then set GEE_PROJECT in backend/.env.  That's it — no JSON key required.

For production / unattended deployments (e.g. Render, Railway, Cloud Run) see
the comments in backend/.env.example for the service-account-JSON fallback.
"""
import os
import threading

import ee
from dotenv import load_dotenv

load_dotenv()

_init_lock = threading.Lock()
_initialized = False


class EarthEngineConfigError(RuntimeError):
    """Raised when GEE credentials are missing or invalid."""


def ensure_initialized() -> None:
    """Initialize the Earth Engine client once per process (thread-safe).

    Auth priority:
      1. GEE_SERVICE_ACCOUNT + GEE_PRIVATE_KEY_FILE / GEE_PRIVATE_KEY_JSON
         (for unattended server deployments — set all three in .env)
      2. Locally stored OAuth credentials written by `earthengine authenticate`
         (default for local development — no env vars needed beyond GEE_PROJECT)
      3. Application Default Credentials from `gcloud auth application-default login`
         (works on Cloud Run, Vertex AI, GCE automatically)
    """
    global _initialized
    if _initialized:
        return

    with _init_lock:
        if _initialized:  # re-check inside the lock
            return

        project = os.getenv("GEE_PROJECT") or None

        service_account = os.getenv("GEE_SERVICE_ACCOUNT", "").strip()
        key_json_str = os.getenv("GEE_PRIVATE_KEY_JSON", "").strip()
        key_file = os.getenv("GEE_PRIVATE_KEY_FILE", "").strip()

        if service_account and (key_json_str or key_file):
            # --- Service-account path (production / CI) ---
            import json
            import tempfile

            if key_json_str:
                try:
                    json.loads(key_json_str)
                except json.JSONDecodeError as exc:
                    raise EarthEngineConfigError(
                        f"GEE_PRIVATE_KEY_JSON is not valid JSON: {exc}"
                    ) from exc
                fd, resolved_key = tempfile.mkstemp(suffix=".json", prefix="gee-key-")
                with os.fdopen(fd, "w") as fh:
                    fh.write(key_json_str)
            else:
                resolved_key = key_file
                if not os.path.exists(resolved_key):
                    raise EarthEngineConfigError(
                        f"GEE service-account key file not found at '{resolved_key}'. "
                        "Download it from Google Cloud Console or use OAuth authentication instead."
                    )

            credentials = ee.ServiceAccountCredentials(service_account, resolved_key)
            ee.Initialize(credentials, project=project)

        else:
            # --- OAuth / ADC path (local development) ---
            # Credentials were saved by `earthengine authenticate`.
            # ee.Initialize() picks them up automatically; no extra args needed.
            try:
                ee.Initialize(project=project)
            except Exception as exc:
                raise EarthEngineConfigError(
                    "Earth Engine initialization failed. For local development run:\n"
                    "  earthengine authenticate\n"
                    "  earthengine set_project YOUR_PROJECT_ID\n"
                    "Then set GEE_PROJECT in backend/.env.\n"
                    f"Original error: {exc}"
                ) from exc

        _initialized = True
