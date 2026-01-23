"""
Structured logging configuration with colored output (Pino-style for Python)
"""
import logging
import sys
from datetime import datetime
from pythonjsonlogger import jsonlogger
import colorlog
from .config import settings


class StructuredFormatter(jsonlogger.JsonFormatter):
    """JSON formatter for structured logging"""
    
    def add_fields(self, log_record, record, message_dict):
        super(StructuredFormatter, self).add_fields(log_record, record, message_dict)
        
        # Add timestamp
        log_record['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        
        # Add log level
        log_record['level'] = record.levelname
        
        # Add service name
        log_record['service'] = settings.SERVICE_NAME
        
        # Add logger name (module)
        log_record['logger'] = record.name


def setup_logging():
    """Configure application logging with structured output"""
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Remove existing handlers
    root_logger.handlers = []
    
    console_handler = logging.StreamHandler(sys.stdout)
    
    if settings.LOG_LEVEL.upper() == 'DEBUG':
        color_formatter = colorlog.ColoredFormatter(
            '%(log_color)s%(asctime)s - %(name)s - %(levelname)s%(reset)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S',
            log_colors={
                'DEBUG': 'cyan',
                'INFO': 'green',
                'WARNING': 'yellow',
                'ERROR': 'red',
                'CRITICAL': 'red,bg_white',
            }
        )
        console_handler.setFormatter(color_formatter)
    else:
        json_formatter = StructuredFormatter(
            '%(timestamp)s %(level)s %(service)s %(logger)s %(message)s'
        )
        console_handler.setFormatter(json_formatter)
    
    root_logger.addHandler(console_handler)
    
    # Suppress verbose logs from external libraries
    logging.getLogger('aio_pika').setLevel(logging.WARNING)
    logging.getLogger('aiormq').setLevel(logging.WARNING)
    logging.getLogger('motor').setLevel(logging.WARNING)
    logging.getLogger('pymongo').setLevel(logging.WARNING)
    
    return root_logger


# Initialize logger
logger = setup_logging()