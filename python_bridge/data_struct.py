# data_struct.py
from dataclasses import dataclass, field
from typing import List

@dataclass
class GpsData:
    lon: float = 0.0
    lat: float = 0.0
    Alt: float = 0.0
    velN: float = 0.0
    velE: float = 0.0
    velD: float = 0.0
    fixType: int = 0

@dataclass
class ImuData:
    acc: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])
    gyro: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])
    mag: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])
    euler: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])
    temperature: float = 0.0
    pressure: float = 0.0
    P_alt: float = 0.0
    ejection: int = 0
    launch: int = 0 # <-- launch 필드 추가