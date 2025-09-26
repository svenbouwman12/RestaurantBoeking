# Database Migratie Instructies

## Voor Bestaande Databases

Als je de fout `ERROR: 42P07: relation "tables" already exists` krijgt, betekent dit dat je database al bestaat. Gebruik dan de migratie script in plaats van het volledige schema.

### Stap 1: Voer de migratie uit

Ga naar je Supabase Dashboard → SQL Editor en voer het volgende script uit:

```sql
-- Kopieer en plak de inhoud van migration-settings.sql
```

Of upload het bestand `migration-settings.sql` en voer het uit.

### Stap 2: Verificeer de migratie

Controleer of de nieuwe tabel en kolommen zijn toegevoegd:

```sql
-- Controleer restaurant_settings tabel
SELECT * FROM restaurant_settings;

-- Controleer nieuwe kolommen in reservations
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'reservations' 
AND column_name IN ('duration_hours', 'buffer_minutes');
```

## Voor Nieuwe Databases

Voor nieuwe databases kun je het volledige schema gebruiken:

```sql
-- Voer supabase-schema.sql uit
```

## Wat de Migratie Toevoegt

1. **restaurant_settings tabel** - Voor instellingen zoals openingstijden
2. **duration_hours kolom** - In reservations tabel voor flexibele reserveringsduur
3. **buffer_minutes kolom** - In reservations tabel voor bufferperiode
4. **Standaard instellingen** - Voorgeconfigureerde waarden

## Troubleshooting

### Als de migratie faalt:
1. Controleer of je de juiste rechten hebt
2. Zorg dat er geen actieve verbindingen zijn
3. Probeer de migratie in delen uit te voeren

### Als instellingen niet verschijnen:
1. Controleer of de restaurant_settings tabel bestaat
2. Controleer of de standaard waarden zijn ingevoegd
3. Refresh de frontend applicatie
