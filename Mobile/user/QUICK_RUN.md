# ⚡ Quick Run - Copy & Paste

## Prerequisites Check
- ✅ Backend server running (`cd Server && npm start`)
- ✅ Metro bundler running (`cd MobileApp && npm start`)
- ✅ Emulator running (`adb devices` shows device)

## Run the App

```bash
cd "Journey-Through-Pakistan/MobileApp"
npm run android
```

**That's it!** The app will build and launch automatically.

---

## If Something Doesn't Work

1. **Check emulator**: `adb devices`
2. **Check Metro**: Make sure `npm start` is running
3. **Check server**: Make sure backend is running on port 3000
4. **Fix port**: `./fix-port.sh` if port 8081 is busy

---

**Everything is configured! Just run `npm run android`! 🚀**

