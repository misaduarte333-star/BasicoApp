# BarberApp Suite - Repository Structure

This repository has been split into two separate projects for better version management and independent deployments.

## Repositories

### 1. **BarberAppV3** (This Repository)
**BasicoApp** - Entry-level barber shop management system
- Location: `./BasicoApp`
- Repository: [BarberAppV3](https://github.com/yourusername/BarberAppV3)
- Features: Essential appointment scheduling, client management, basic reporting

### 2. **BarberAppV3-PremiumApp** (Separate Repository)
**PremiumApp** - Advanced barber shop management system
- Location: `../BarberAppV3-PremiumApp`
- Repository: [BarberAppV3-PremiumApp](https://github.com/yourusername/BarberAppV3-PremiumApp)
- Features: AI integration, advanced analytics, real-time scheduling, financial tracking

## Project Structure

```
BarberAppV3/                    ← Main repository (BasicoApp only)
├── BasicoApp/                 ← Production-ready basic version
│   ├── src/
│   ├── supabase/
│   ├── package.json
│   └── ...
└── README.md                  ← This file

BarberAppV3-PremiumApp/        ← Separate repository
├── src/
├── supabase/
├── package.json
├── README.md
└── ...
```

## Getting Started

### For BasicoApp Development

```bash
cd BasicoApp
npm install
npm run dev
```

### For PremiumApp Development

```bash
# Clone the separate repository
git clone https://github.com/yourusername/BarberAppV3-PremiumApp.git
cd BarberAppV3-PremiumApp
npm install
npm run dev
```

## Why Separate Repositories?

1. **Independent Versioning** - Each app maintains its own version history
2. **Separate Deployments** - Deploy and upgrade independently
3. **Easier Maintenance** - Easier to manage dependencies and features
4. **Clear Responsibility** - Each team focuses on their product
5. **Reduced Complexity** - Smaller repositories are easier to work with

## Deployment

### BasicoApp
- Deploy from `main` branch of BarberAppV3
- Production URL: `https://basic.barberapp.com`

### PremiumApp
- Deploy from `main` branch of BarberAppV3-PremiumApp
- Production URL: `https://premium.barberapp.com`

## Migration Notes

**PremiumApp was separated from BarberAppV3 on April 14, 2026**
- PremiumApp has its own complete history starting from first commit
- BasicoApp continues its development independently

## Support & Documentation

- BasicoApp: See `BasicoApp/README.md`
- PremiumApp: See `BarberAppV3-PremiumApp/README.md`

## Version Map

| App | Version | Release | Status |
|-----|---------|---------|--------|
| BasicoApp | 1.x | Initial | Active |
| PremiumApp | 2.x | Premium Suite | Active |

---

**Last Updated**: April 14, 2026
