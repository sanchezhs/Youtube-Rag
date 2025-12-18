from typing import Any, Optional


class AppException(Exception):
    """Base exception for the application."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: Optional[Any] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class NotFoundError(AppException):
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} not found: {identifier}",
            status_code=404,
        )


class ValidationError(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            status_code=422,
            details=details,
        )


class ExternalServiceError(AppException):
    def __init__(self, service: str, message: str):
        super().__init__(
            message=f"{service} error: {message}",
            status_code=502,
        )


class PipelineError(AppException):
    def __init__(self, stage: str, message: str):
        super().__init__(
            message=f"Pipeline error in {stage}: {message}",
            status_code=500,
        )
