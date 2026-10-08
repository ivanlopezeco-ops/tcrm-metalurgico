"""Contratos de datos entre la actualización diaria y la plantilla Atlas."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import pandas as pd
import api_bcra
import generar_dashboard as dashboard


class Integracion(unittest.TestCase):
    def test_cotizacion_alineada_y_fechas_sin_dato(self):
        with tempfile.TemporaryDirectory() as tmp:
            archivo = Path(tmp) / 'USD.csv'
            archivo.write_text('fecha,USD\n2026-09-01,1400\n2026-09-03,1420\n', encoding='utf-8')
            bil = pd.DataFrame(index=pd.date_range('2026-09-01', '2026-10-02'))
            with patch.object(dashboard, 'DOLAR', archivo):
                dolar = dashboard._dolar(bil)
            self.assertEqual(dolar['diario'][:4], [1400, None, 1420, None])
            self.assertEqual(dolar['mensual'], [1410, None])
            with patch.object(dashboard, 'DOLAR', Path(tmp) / 'ausente.csv'):
                self.assertIsNone(dashboard._dolar(bil))

    def test_actualizacion_nominal_incremental(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache = Path(tmp)
            (cache / 'ARS_por_USD.csv').write_text('fecha,USD\n2026-09-10,1450\n', encoding='utf-8')
            nueva = pd.Series([1455., 1460.], index=pd.to_datetime(['2026-09-11', '2026-09-14']))
            with patch.object(api_bcra, 'CACHE', cache), patch.object(api_bcra, 'serie', return_value=nueva) as pedir, patch.object(api_bcra.time, 'sleep'):
                s = api_bcra.bajar_dolar(hasta='2026-09-14')
                pedir.assert_called_once_with('USD', '2026-09-11', '2026-09-14')
                self.assertEqual(s.tolist(), [1450, 1455, 1460])
                pedir.reset_mock()
                api_bcra.bajar_dolar(hasta='2026-09-14')
                pedir.assert_not_called()

    def test_generador_inserta_datos_de_cada_ejecucion(self):
        with tempfile.TemporaryDirectory() as tmp:
            destino = Path(tmp) / 'index.html'
            for corte in ['2026-10-06', '2026-10-07']:
                datos = {'actualizado': corte, 'diario': {'fechas': [corte]}}
                with patch.object(dashboard, 'datos', return_value=datos):
                    dashboard.generar(destino)
                html = destino.read_text(encoding='utf-8')
                payload = html.split('window.DATOS=')[1].split(';</script>')[0]
                self.assertEqual(json.loads(payload), datos)
                self.assertNotIn('__TCRM_DATOS__', html)
                self.assertNotIn('Ver v13', html)


if __name__ == '__main__':
    unittest.main()
