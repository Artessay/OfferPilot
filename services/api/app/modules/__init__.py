"""Domain modules (vertical slices).

Each subpackage owns one bounded context and is structured the same way::

    modules/<domain>/
        router.py      # FastAPI routes (transport)
        service.py     # business logic / orchestration
        repository.py  # data access
        models.py      # SQLAlchemy ORM models
        schemas.py     # Pydantic request/response models

Modules depend on ``app.shared`` and on each other only through service
interfaces, never by importing another module's repository directly. This
boundary is what makes a future extraction into microservices low-cost.
"""
