"""
Nombres con tilde para el tablero.

Las bases de origen traen paises y rubros sin tildes. Se corrigen solo en lo
que ve el usuario del tablero: los CSV y el Excel conservan los nombres
originales, que son las claves con que se cruzan las fuentes.
"""

from __future__ import annotations

TILDES = {
    "Canada": "Canadá",
    "Mexico": "México",
    "Japon": "Japón",
    "Sudafrica": "Sudáfrica",
    "Republica Checa": "República Checa",
    "Turquia": "Turquía",
    "Peru": "Perú",
    "Carrocerias y remolques": "Carrocerías y remolques",
    "Maquinaria agricola": "Maquinaria agrícola",
}


def con_tildes(obj):
    """Corrige los nombres en cualquier estructura de datos del tablero.

    Reemplaza cadenas exactas (claves y valores) y tambien el nombre de las
    series oficiales, que tienen la forma "IMPO - Carrocerias y remolques".
    """
    if isinstance(obj, dict):
        return {con_tildes(k): con_tildes(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [con_tildes(v) for v in obj]
    if isinstance(obj, str):
        if obj in TILDES:
            return TILDES[obj]
        lado, sep, resto = obj.partition(" - ")
        if sep and resto in TILDES:
            return lado + sep + TILDES[resto]
    return obj
