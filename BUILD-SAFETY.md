# 🛡️ Build Safety Guide

## ⚠️ NOOIT MEER BUILD FAILURES!

Dit project heeft nu **automatische controles** die voorkomen dat code met syntax errors wordt gepusht naar GitHub.

## 🔒 Automatische Bescherming

### 1. **Pre-commit Hook** (.husky/pre-commit)
- ✅ Controleert syntax errors VOORDAT je commit
- ✅ Runt linting en build test
- ✅ Blokkeert commit als er fouten zijn

### 2. **GitHub Actions** (.github/workflows/build-check.yml)
- ✅ Test elke push naar main branch
- ✅ Runt automatisch linting en build
- ✅ Voorkomt dat broken code wordt gemerged

### 3. **Local Test Script** (test-build.sh)
- ✅ Test je code lokaal voordat je pusht
- ✅ Simuleert exact wat Vercel doet

## 🚀 Hoe te Gebruiken

### Voordat je Pusht:
```bash
# Test je code lokaal
./test-build.sh

# Als alles goed gaat, push dan pas
git push origin main
```

### Als je Code Wijzigt:
```bash
# Wijzig je code...

# Test automatisch (runs on commit)
git add .
git commit -m "Your changes"

# Als commit faalt, fix de errors en probeer opnieuw
```

## 🛠️ Troubleshooting

### Als Pre-commit Hook Faalt:
```bash
# Fix de errors die getoond worden
# Probeer dan opnieuw:
git add .
git commit -m "Fixed errors"
```

### Als GitHub Actions Faalt:
1. Ga naar GitHub → Actions tab
2. Bekijk de foutmeldingen
3. Fix de errors lokaal
4. Push opnieuw

### Als Local Test Faalt:
```bash
# Run het test script
./test-build.sh

# Fix alle errors die getoond worden
# Test opnieuw tot alles groen is
```

## 📋 Wat Wordt Gecontroleerd

- ✅ **Syntax Errors** - JSX, TypeScript, JavaScript
- ✅ **Linting Errors** - Code kwaliteit en stijl
- ✅ **Build Errors** - Compile fouten
- ✅ **Type Errors** - TypeScript type checking
- ✅ **Import Errors** - Missing imports

## 🎯 Resultaat

**GEEN build failures meer op Vercel!** 

Elke push naar GitHub is gegarandeerd werkend omdat:
1. Pre-commit hook blokkeert broken commits
2. GitHub Actions test elke push
3. Local test script laat je lokaal testen

## ⚡ Quick Commands

```bash
# Test alles
./test-build.sh

# Fix linting errors
cd client && npm run lint:fix

# Build lokaal
cd client && npm run build

# Check status
cd client && npm run lint
```

**🎉 Vanaf nu: GEEN build failures meer!**
