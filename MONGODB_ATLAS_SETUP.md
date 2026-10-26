# ☁️ MongoDB Atlas Cloud - Setup & Configuração

## ✅ Status Atual

```
✅ MongoDB Atlas configurado
✅ Connection string no .env
✅ Backend pronto para conectar
✅ Histórico de 30 dias habilitado
```

---

## 🔑 Configuração segura da conexão

Configure `MONGO_URI` no gerenciador de Secrets do ambiente de execução (ou
em um `.env` local que não seja versionado). Não inclua a URI, usuário ou senha
em arquivos do repositório, comandos registrados no histórico do shell ou logs.
Se uma URI já foi commitada, revogue a credencial correspondente no MongoDB
Atlas e crie uma nova antes de usar o ambiente.

---

## 🏗️ Arquitetura Final

```
┌──────────────────────────────────┐
│   FRONTEND (Nginx, porta 80)     │
└──────────────┬───────────────────┘
               │
    (rede docker interna)
               │
┌──────────────▼───────────────────┐
│   BACKEND (Node.js)              │
│  ✅ Cache em Memória (5-10 min)  │
│  ✅ MongoDB Atlas (persistência) │
│  ✅ SQLite (geocodes)            │
└──────────────┬───────────────────┘
               │
         (internet/HTTPS)
               │
    ┌──────────▼─────────┐
    │ MongoDB Atlas      │
    │ (Nuvem)            │
    │                    │
    │ • Histórico 30 dias
    │ • Auto-backup      │
    │ • Escalável        │
    └────────────────────┘
```

---

## 📊 Fluxo de Dados Agora

```
1. Frontend requisita /api/sensors
   ↓
2. Backend verifica Cache em Memória (< 1ms)
   ↓
   ✅ Dado recente? Retorna imediatamente
   ❌ Expirou (5-10 min)? Busca APIs externas
   ↓
3. Busca de 6 fontes:
   • OpenSenseMap
   • Sensor.Community
   • OpenWeather
   • BreezoMeter
   • AQICN
   • Open-Meteo
   ↓
4. Calcula ICAU-D
   ↓
5. Salva em:
   ✅ Memória (cache rápido, 5-10 min)
   ✅ MongoDB Atlas (histórico, 30 dias)
   ✅ SQLite (geocodes locais)
   ↓
6. Retorna JSON para Frontend
```

---

## 🔍 Verificar Conectividade

### **Método 1: Pelo Portainer**

No container `iot_backend`, execute:

```bash
# Execute de dentro de backend para carregar um .env local, se estiver usando um.
cd backend
node check_mongo.mjs

# Dentro do mongosh:
show dbs
use iot_platform
db.sensorReadings.countDocuments()
```

Deve retornar um número ≥ 0

### **Método 2: Pelos Logs**

No Portainer:
```
Containers → iot_backend → Logs
```

Procure por:
```
✅ 📦 Conectando ao MongoDB...
✅ MongoDB conectado
✅ [1/3] Sensores: XXX carregados
✅ XXX leituras de sensores salvas no MongoDB
```

### **Método 3: MongoDB Atlas Dashboard**

1. Acesse https://cloud.mongodb.com
2. Selecione o cluster do projeto
3. Aba **Collections**
4. Database: `iot_platform`
5. Collection: `sensorReadings`

Deve mostrar documentos sendo salvos em tempo real!

---

## 💾 Dados Que Persistem Agora

```
✅ PERSISTEM:
   ├─ Leituras de sensores (30 dias)
   ├─ Cidades agregadas
   ├─ ICAU-D scores histórico
   ├─ Geocodes (SQLite local)
   └─ Top 10 cidades

❌ NÃO PERSISTEM:
   └─ Cache em memória (perdido em restart)
      └─ Recarregado no warm-up
```

---

## ⚙️ Configurações MongoDB Atlas

### **Database Name**
```
iot_platform
```

### **Collections Criadas Automaticamente**

```
iot_platform/
├─ sensorReadings
│  ├─ TTL Index: 30 dias (auto-delete)
│  ├─ Fields: sensorId, location, measurements, icaud, recordedAt
│  └─ Index: recordedAt descending
├─ cacheEntries (se usar)
└─ ...
```

### **Backup Automático**

MongoDB Atlas faz:
- ✅ Snapshots diários
- ✅ Retenção de 7 dias
- ✅ Restore instantâneo
- ✅ Sem custo extra

---

## 🔐 Segurança

### **IP Whitelist (Importante!)**

No MongoDB Atlas:
1. **Network Access** → **IP Whitelist**
2. Deve estar liberado para:
   - ✅ IP da máquina Docker (servidor)
   - ✅ 0.0.0.0/0 (qualquer IP) ⚠️ Menos seguro

**Status Atual:** Verificar no dashboard Atlas

### **Credenciais**

⚠️ **ATENÇÃO:** A connection string está no `.env`

Para maior segurança em produção:
- [ ] Usar variável de ambiente do sistema
- [ ] Colocar em `.env.local` (não versionado)
- [ ] Usar secrets do Portainer

---

## 📈 Quotas e Limites

### **Free Tier (M0)**

```
✅ 512 MB de armazenamento
✅ Backup automático
✅ Compartilhado (3 replicas)
✅ Sem downtime
```

### **Se Exceder Limite**

Upgrade para M2 ou M5:
- M2: 2 GB, ~$9/mês
- M5: 5 GB, ~$57/mês

---

## 🚀 Próximas Etapas

1. ✅ Subir containers no Portainer
2. ✅ Esperar warm-up completar
3. ✅ Verificar dados no MongoDB Atlas
4. ✅ Conferir dashboard com dados históricos

---

## 📊 Comparação: MongoDB vs Memory-Only

| Aspecto | MongoDB Atlas | Memory-Only |
|---------|---|---|
| **Histórico** | 30 dias | Nenhum |
| **Persistência** | ✅ Permanente | ❌ Temp |
| **Escalabilidade** | ✅ Ilimitada | ❌ Limitada |
| **Backup** | ✅ Automático | ❌ Manual |
| **Custo** | Grátis (M0) | Grátis |
| **Performance** | 10-50ms | <1ms |

---

## ✨ Resumo

- ✅ **MongoDB Atlas Cloud** configurado
- ✅ **Connection string** no .env
- ✅ **Histórico de 30 dias** ativado
- ✅ **Backup automático** habilitado
- ✅ **Pronto para produção**

**Vamos subir no Portainer!** 🌿
