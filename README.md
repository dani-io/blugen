# 🏋️ Blugen - سیستم مدیریت تمرین باشگاه

> [blugen.ir](https://blugen.ir)

## معرفی
اپلیکیشن PWA برای مدیریت برنامه تمرین باشگاه.
مربی برنامه می‌نویسد، شاگرد روی گوشی اجرا می‌کند.

## معماری
```
Internet → blugen.ir
              │
         ┌────▼────┐
         │  Nginx  │  :80/:443 (SSL)
         └────┬────┘
              │
     ┌────────┼────────┐
     ▼                 ▼
┌─────────┐      ┌──────────┐
│ Frontend│      │ Backend  │
│ React   │      │ FastAPI  │
│ PWA     │      │          │
└─────────┘      └────┬─────┘
                      │
                 ┌────▼────┐
                 │ SQLite  │
                 │ blugen  │
                 └─────────┘
```

## Tech Stack
- **Frontend:** React 18 + Vite + PWA (Workbox)
- **Backend:** Python FastAPI + SQLite
- **Proxy:** Nginx + Let's Encrypt SSL
- **Deploy:** Docker Compose on Proxmox

## راه‌اندازی

### پیش‌نیازها
- Docker + Docker Compose
- دامنه blugen.ir به IP سرور point شده باشد
- پورت 80 و 443 باز باشد

### اجرا
```bash
git clone https://github.com/YOUR_USERNAME/blugen.git
cd blugen
chmod +x deploy.sh renew-ssl.sh
./deploy.sh
```

### تمدید خودکار SSL
```bash
crontab -e
# اضافه کن:
0 3 * * 1 /path/to/blugen/renew-ssl.sh
```

## اکانت پیش‌فرض
| نقش | شماره | رمز |
|-----|--------|------|
| مدیر | 09120000000 | 0000 |

رمز پیش‌فرض کاربران جدید: ۴ رقم آخر شماره موبایل

## API
```
POST   /api/auth/login              ورود
POST   /api/auth/change-password    تغییر رمز
GET    /api/auth/me                 پروفایل

GET    /api/users                   لیست کاربران
POST   /api/users                   ساخت کاربر

GET    /api/exercises               حرکات
POST   /api/exercises               افزودن حرکت

GET    /api/programs                برنامه‌ها
POST   /api/programs                ساخت برنامه

GET    /api/packages                پکیج‌ها
POST   /api/packages                ساخت پکیج

POST   /api/logs                    ثبت لاگ
GET    /api/logs/progress/:id       پیشرفت

GET    /api/stats/trainer            آمار مربی
GET    /api/stats/trainee            آمار شاگرد
```

## Roadmap
- [ ] سیستم پکیج ۱۲/۲۴ جلسه‌ای
- [ ] نمودار پیشرفت وزنه
- [ ] برنامه تغذیه و مکمل
- [ ] گزارش PDF
- [ ] Multi-tenant (چند باشگاه)
- [ ] نوتیفیکیشن یادآوری

## License
MIT
