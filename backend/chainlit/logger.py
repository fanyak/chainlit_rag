import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    stream=sys.stdout,
    format="%(asctime)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logging.getLogger("socketio").setLevel(logging.ERROR)
logging.getLogger("engineio").setLevel(logging.ERROR)
logging.getLogger("numexpr").setLevel(logging.ERROR)


logger = logging.getLogger("chainlit")

payment_logger = logging.getLogger("payment_processor")
db_logger = logging.getLogger("database")
flow_logger = logging.getLogger("flow")
db_logger.setLevel(logging.ERROR)

# Add file handler only to chainlit logger
payment_logger_file_handler = logging.FileHandler(
    "payment_processor.log", encoding="utf-8"
)
payment_logger_file_handler.setFormatter(
    logging.Formatter("%(asctime)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
)
payment_logger.addHandler(payment_logger_file_handler)

db_logger_file_handler = logging.FileHandler("database.log", encoding="utf-8")
db_logger_file_handler.setFormatter(
    logging.Formatter("%(asctime)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
)
db_logger.addHandler(db_logger_file_handler)

flow_logger_file_handler = logging.FileHandler("flow.log", encoding="utf-8")
flow_logger_file_handler.setFormatter(
    logging.Formatter("%(asctime)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
)
flow_logger.addHandler(flow_logger_file_handler)
