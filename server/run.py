"""
Windows-compatible server runner for SurgeAI.
Fixes the uvicorn event loop issue on Windows.
"""
import sys
import asyncio

# Fix Windows event loop policy (required for Python 3.13+ on Windows)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
    )
