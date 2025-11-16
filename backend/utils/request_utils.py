"""
Request Cancellation Utilities
================================
Helper functions for handling client disconnect and request cancellation in FastAPI.

Usage:
    from utils.request_utils import run_with_disconnect_check
    
    @app.post("/api/endpoint")
    async def my_endpoint(request: Request, data: MyRequest):
        result = await run_with_disconnect_check(
            my_function,
            request,
            arg1, arg2
        )
        
        if result is None:
            return JSONResponse(
                status_code=499,
                content={"detail": "Request cancelled by client"}
            )
        
        return result
"""

import asyncio
import logging
from typing import Callable, Any, Optional
from fastapi import Request

logger = logging.getLogger(__name__)


async def run_with_disconnect_check(
    func: Callable,
    request: Request,
    *args,
    check_interval: float = 0.5,
    **kwargs
) -> Optional[Any]:
    """
    Run a synchronous function while periodically checking if client disconnected.
    
    This allows long-running backend operations to be cancelled when the user
    clicks "Stop" in the frontend, saving server resources.
    
    Args:
        func: The synchronous function to run (e.g., parser.parse, llm.invoke)
        request: FastAPI Request object to check for disconnect
        *args: Positional arguments to pass to func
        check_interval: How often to check for disconnect (seconds). Default: 0.5s
        **kwargs: Keyword arguments to pass to func
    
    Returns:
        Result from func if successful, None if client disconnected
    
    Example:
        ```python
        result = await run_with_disconnect_check(
            parser.parse,
            request,
            text_to_parse
        )
        
        if result is None:
            # Client disconnected, return early
            return JSONResponse(status_code=499, content={"detail": "Cancelled"})
        ```
    """
    # Create task to run function in thread pool (for sync functions)
    task = asyncio.create_task(
        asyncio.to_thread(func, *args, **kwargs)
    )
    
    # Poll for client disconnect while task is running
    while not task.done():
        # Check if client disconnected
        if await request.is_disconnected():
            logger.warning(f"  Client disconnected during {func.__name__} - cancelling")
            
            # Cancel the task
            task.cancel()
            
            try:
                # Wait for cancellation to complete
                await task
            except asyncio.CancelledError:
                logger.info(f"✅ {func.__name__} cancelled successfully")
            
            return None
        
        # Wait before checking again
        await asyncio.sleep(check_interval)
    
    # Task completed successfully
    return await task


async def run_async_with_disconnect_check(
    async_func: Callable,
    request: Request,
    *args,
    check_interval: float = 0.5,
    **kwargs
) -> Optional[Any]:
    """
    Run an async function while checking for client disconnect.
    
    Same as run_with_disconnect_check but for async functions.
    
    Args:
        async_func: The async function to run
        request: FastAPI Request object
        *args: Positional arguments
        check_interval: Check interval in seconds
        **kwargs: Keyword arguments
    
    Returns:
        Result from async_func if successful, None if cancelled
    """
    # Create task for async function
    task = asyncio.create_task(async_func(*args, **kwargs))
    
    # Poll for disconnect
    while not task.done():
        if await request.is_disconnected():
            logger.warning(f"  Client disconnected during {async_func.__name__}")
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                logger.info(f"✅ {async_func.__name__} cancelled")
            return None
        
        await asyncio.sleep(check_interval)
    
    return await task


def is_cancellation_error(error: Exception) -> bool:
    """
    Check if an error is due to request cancellation.
    
    Args:
        error: Exception to check
    
    Returns:
        True if error is cancellation-related
    """
    error_str = str(error).lower()
    return (
        isinstance(error, asyncio.CancelledError) or
        "cancelled" in error_str or
        "abort" in error_str or
        "disconnect" in error_str
    )


async def check_client_connected(request: Request) -> bool:
    """
    Simple check if client is still connected.
    
    Args:
        request: FastAPI Request object
    
    Returns:
        True if client is connected, False if disconnected
    """
    return not await request.is_disconnected()


# ============================================
# DECORATOR VERSION (Optional Advanced Usage)
# ============================================

from functools import wraps

def with_disconnect_check(check_interval: float = 0.5):
    """
    Decorator to automatically add disconnect checking to endpoints.
    
    Usage:
        @app.post("/api/parse")
        @with_disconnect_check(check_interval=0.5)
        async def parse_endpoint(request: Request, data: ParseRequest):
            # Your code here - will auto-cancel if client disconnects
            result = await some_long_operation()
            return result
    
    Note: The endpoint must have 'request: Request' as first parameter.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Check disconnect before starting
            if await request.is_disconnected():
                logger.warning(f"  Client disconnected before {func.__name__} started")
                from fastapi.responses import JSONResponse
                return JSONResponse(
                    status_code=499,
                    content={"detail": "Request cancelled by client"}
                )
            
            # Run function with disconnect monitoring
            return await run_async_with_disconnect_check(
                func,
                request,
                *args,
                check_interval=check_interval,
                **kwargs
            )
        
        return wrapper
    return decorator


# ============================================
# EXAMPLE USAGE
# ============================================

if __name__ == "__main__":
    """
    Example showing how to use these utilities in your FastAPI app.
    """
    
    print("Request Cancellation Utilities")
    print("=" * 60)
    print()
    print("Usage in main.py:")
    print()
    print("1. Import:")
    print("   from utils.request_utils import run_with_disconnect_check")
    print()
    print("2. Use in endpoint:")
    print("""
    @app.post("/api/parse")
    async def parse_text(request: Request, data: ParseRequest):
        result = await run_with_disconnect_check(
            parser.parse,
            request,
            data.text
        )
        
        if result is None:
            return JSONResponse(
                status_code=499,
                content={"detail": "Request cancelled"}
            )
        
        return result
    """)
    print()
    print("Benefits:")
    print("   Saves server resources")
    print("   Stops LLM calls when user cancels")
    print("   Clean error handling")
    print("   Reusable across endpoints")
    print()