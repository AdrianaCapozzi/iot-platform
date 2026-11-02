"""
Converte o JSON do endpoint /api/cities (EcoSense) em CSV.

Uso:
    python json_para_csv.py cities.json              # le de arquivo
    python json_para_csv.py --baixar                 # baixa direto da API
    python json_para_csv.py cities.json --so-brasil  # filtra country == BR

Gera:
    cidades.csv   -> uma linha por cidade (colunas achatadas)
    sensores.csv  -> uma linha por (cidade, sensor)

Requisitos: Python 3.8+ ; para --baixar: pip install requests
"""
import csv
import json
import sys

URL = "https://iot-platform.viniciusgnandt.com.br/api/cities"


def carregar(argv):
    if "--baixar" in argv:
        import requests
        r = requests.get(URL, timeout=60)
        r.raise_for_status()
        return r.json()
    caminho = next((a for a in argv[1:] if not a.startswith("--")), None)
    if not caminho:
        sys.exit("Informe o arquivo JSON ou use --baixar")
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def g(d, *chaves):
    """Acesso seguro a chaves aninhadas; devolve '' se ausente/null."""
    for k in chaves:
        if not isinstance(d, dict):
            return ""
        d = d.get(k)
    return "" if d is None else d


def main():
    corpo = carregar(sys.argv)
    cidades = corpo["data"]
    if "--so-brasil" in sys.argv:
        cidades = [c for c in cidades if c.get("country") == "BR"]

    cols = [
        "id", "name", "country", "lat", "lon", "sensor_count",
        "temperature", "humidity", "pm25", "pm10", "wind_speed",
        "icaud_score", "icaud_class", "icaud_min", "icaud_max",
        "cmp_temperature", "cmp_humidity", "cmp_airQuality", "cmp_wind",
        "w_temperature", "w_humidity", "w_airQuality", "w_wind",
        "available_components",
        "pm25_sources", "pm25_max_km", "temp_sources", "temp_max_km",
        "last_seen", "updated_at",
    ]

    # utf-8-sig para o Excel abrir acentos corretamente
    with open("cidades.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for c in cidades:
            m = c.get("measurements", {})
            ic = c.get("icaud", {})
            cl = ic.get("classification", {})
            cp = ic.get("components", {})
            wt = ic.get("weights", {})
            ms = c.get("measurementSources", {})
            w.writerow([
                c.get("id"), c.get("name"), c.get("country"),
                g(c, "location", "lat"), g(c, "location", "lon"),
                c.get("sensorCount", ""),
                g(m, "temperature"), g(m, "humidity"), g(m, "pm25"),
                g(m, "pm10"), g(m, "windSpeed"),
                g(ic, "score"), g(cl, "label"), g(cl, "min"), g(cl, "max"),
                g(cp, "temperature"), g(cp, "humidity"),
                g(cp, "airQuality"), g(cp, "wind"),
                g(wt, "temperature"), g(wt, "humidity"),
                g(wt, "airQuality"), g(wt, "wind"),
                "|".join(ic.get("availableComponents", [])),
                "|".join(g(ms, "pm25", "sources") or []),
                g(ms, "pm25", "maxDistanceKm"),
                "|".join(g(ms, "temperature", "sources") or []),
                g(ms, "temperature", "maxDistanceKm"),
                c.get("lastSeen", ""), c.get("updatedAt", ""),
            ])

    with open("sensores.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["city_id", "sensor_id", "name", "source", "device_type",
                    "last_seen", "provides"])
        for c in cidades:
            for s in c.get("sensorList", []):
                w.writerow([
                    c.get("id"), s.get("id"), s.get("name"), s.get("source"),
                    s.get("deviceType"), s.get("lastSeen"),
                    "|".join(s.get("provides", [])),
                ])

    print(f"cidades.csv: {len(cidades)} linhas | sensores.csv gerado")


if __name__ == "__main__":
    main()