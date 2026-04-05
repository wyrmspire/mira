            else:
                logger.warning(f"Unknown target type {target_type}")
                success = False

            if success:
                break
        except Exception as e:
            logger.error(f"Delivery attempt {attempt} failed: {e}")
            success = False
            
        if not success and attempt < max_retries:
            logger.info(f"Delivery failed, retrying in {backoff_ms}ms (attempt {attempt+1}/{max_retries})...")
            await asyncio.sleep((backoff_ms / 1000.0) * (2 ** attempt))

    # Record delivery result
    cache_status = "delivered" if success else "failed"
    _update_run_delivery_status(run_id, cache_status)
    
    cache_metadata = {
        "cache_key": idemp_key,
        "cache_type": "delivery_idempotency",
        "value": {"status": cache_status, "profile_id": profile_id},
        "ttl_hours": 720, # 30 days
        "hit_count": 0
    }
    
    try:
        if cache_resp.data:
            supabase.table("nexus_cache_metadata").update(cache_metadata).eq("cache_key", idemp_key).execute()
        else:
            supabase.table("nexus_cache_metadata").insert(cache_metadata).execute()
    except Exception as e:
        logger.warning(f"Could not record delivery idempotency cache: {e}")

    return success

def _update_run_delivery_status(run_id: str, status: str):
    if supabase:
        try:
            supabase.table("nexus_runs").update({"delivery_status": status}).eq("id", run_id).execute()
        except Exception:
            pass

async def _deliver_mira_adapter(config: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    """Deliver a knowledge payload to the Mira Studio webhook."""
    endpoint = config.get("endpoint")
    if not endpoint:
        # Fallback to local tunnel vs vercel
        local_target = "https://mira.mytsapi.us"
        vercel_target = VERCEL_WEBHOOK_URL or "https://mira-maddyup.vercel.app"
        target_url = f"{vercel_target}/api/webhook/mirak"
        try:
            health = requests.get(f"{local_target}/api/dev/diagnostic", timeout=5)
            if health.status_code == 200:
                target_url = f"{local_target}/api/webhook/mirak"
        except requests.RequestException:
            pass
        endpoint = target_url

    secret_header = config.get("secret_header", "x-mirak-secret")
    headers = {
        secret_header: MIRAK_WEBHOOK_SECRET
    }
    
    logger.info(f"Targeting Mira adapter webhook: {endpoint}")
    resp = requests.post(endpoint, json=payload, headers=headers, timeout=30)
    logger.info(f"Webhook delivered. Status: {resp.status_code}")
    if resp.status_code != 200:
        logger.error(f"Webhook error: {resp.text}")
        return False
    return True

async def _deliver_generic_webhook(config: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    """Deliver to a generic webhook endpoint."""
    endpoint = config.get("endpoint")
    if not endpoint:
        logger.error("No endpoint configured for generic webhook")
        return False
        
    headers = {}
    if config.get("secret_header"):
        # For simplicity, if secret header takes a token directly vs from env
        # Typically one would extract from a vault, but we use MIRAK_WEBHOOK_SECRET here as generic
        headers[config["secret_header"]] = MIRAK_WEBHOOK_SECRET

    logger.info(f"Targeting generic webhook: {endpoint}")
    resp = requests.post(endpoint, json=payload, headers=headers, timeout=30)
    logger.info(f"Generic webhook delivered. Status: {resp.status_code}")
    if resp.status_code != 200:
        logger.error(f"Webhook error: {resp.text}")
        return False
    return True

# Keep for backward compatibility with older pipeline_runner
async def deliver_to_mira(payload: dict) -> bool:
    return await _deliver_mira_adapter({}, payload)

```

### nexus/service/cache/__init__.py

```python
from .research_cache import get_research_cache, set_research_cache, compute_research_cache_key
from .synthesis_cache import get_synthesis_cache, set_synthesis_cache, compute_synthesis_cache_key

```

### nexus/service/cache/research_cache.py

```python
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import json
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client, Client

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

def compute_research_cache_key(topic: str, goal: str, pipeline_version: str, source_bundle_hash: str) -> str:
    raw = f"{topic}|{goal}|{pipeline_version}|{source_bundle_hash}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def get_research_cache(topic: str, goal: str, pipeline_version: str, source_bundle_hash: str = "") -> Optional[Dict[str, Any]]:
    if not supabase:
        return None
    cache_key = compute_research_cache_key(topic, goal, pipeline_version, source_bundle_hash)
    try:
        response = supabase.table("nexus_cache_metadata").select("*").eq("cache_key", cache_key).eq("cache_type", "research").execute()
        data = response.data
        if data:
            record = data[0]
            created_at_dt = datetime.fromisoformat(record["created_at"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            hours_elapsed = (now - created_at_dt).total_seconds() / 3600
            if hours_elapsed <= record["ttl_hours"]:
                # Attempt to update hit count
                supabase.table("nexus_cache_metadata").update({"hit_count": record["hit_count"] + 1}).eq("cache_key", cache_key).execute()
                return record["value"]
            else:
                # Expired
                pass
    except Exception as e:
        print(f"Research cache get error: {str(e)}")
        pass
    return None

def set_research_cache(topic: str, goal: str, pipeline_version: str, source_bundle_hash: str, value: Dict[str, Any], ttl_hours: int = 24):
    if not supabase:
        return
    cache_key = compute_research_cache_key(topic, goal, pipeline_version, source_bundle_hash)
    data = {
        "cache_key": cache_key,
        "cache_type": "research",
        "value": value,
        "ttl_hours": ttl_hours,
        "hit_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        supabase.table("nexus_cache_metadata").upsert(data).execute()
    except Exception as e:
        print(f"Research cache set error: {str(e)}")
        pass

```

### nexus/service/cache/synthesis_cache.py

```python
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import json
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client, Client

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL else None

def compute_synthesis_cache_key(source_bundle_hash: str, query_type: str, model_version: str) -> str:
    raw = f"{source_bundle_hash}|{query_type}|{model_version}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def get_synthesis_cache(source_bundle_hash: str, query_type: str, model_version: str) -> Optional[Dict[str, Any]]:
    if not supabase:
        return None
    cache_key = compute_synthesis_cache_key(source_bundle_hash, query_type, model_version)
    try:
        response = supabase.table("nexus_cache_metadata").select("*").eq("cache_key", cache_key).eq("cache_type", "synthesis").execute()
        data = response.data
        if data:
            record = data[0]
            created_at_dt = datetime.fromisoformat(record["created_at"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            hours_elapsed = (now - created_at_dt).total_seconds() / 3600
            if hours_elapsed <= record["ttl_hours"]:
                supabase.table("nexus_cache_metadata").update({"hit_count": record["hit_count"] + 1}).eq("cache_key", cache_key).execute()
                return record["value"]
    except Exception as e:
        print(f"Synthesis cache get error: {str(e)}")
        pass
    return None

def set_synthesis_cache(source_bundle_hash: str, query_type: str, model_version: str, value: Dict[str, Any], ttl_hours: int = 72):
    if not supabase:
        return
    cache_key = compute_synthesis_cache_key(source_bundle_hash, query_type, model_version)
    data = {
        "cache_key": cache_key,
        "cache_type": "synthesis",
        "value": value,
        "ttl_hours": ttl_hours,
        "hit_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        supabase.table("nexus_cache_metadata").upsert(data).execute()
    except Exception as e:
        print(f"Synthesis cache set error: {str(e)}")
        pass

```

### nexus/service/Dockerfile

```
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy into /app/service so that Python package imports (from .config) work as 'service.config'
COPY . /app/service

# Ensure the .notebooklm directory exists for storage_state.json
RUN mkdir -p /root/.notebooklm

ENV PORT=8002
EXPOSE 8002

CMD ["sh", "-c", "if [ -n \"$NOTEBOOKLM_AUTH_JSON\" ]; then echo \"$NOTEBOOKLM_AUTH_JSON\" > /root/.notebooklm/storage_state.json; fi && uvicorn service.main:app --host 0.0.0.0 --port ${PORT}"]

```

### nexus/service/.dockerignore

```
.env
__pycache__
*.pyc
.git
.gitignore
venv

```

