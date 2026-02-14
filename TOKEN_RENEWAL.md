# Instrukcja Odnawiania Tokenów Social Media

OmniPost używa zmiennych środowiskowych w pliku `.env` do autoryzacji z platformami Social Media. Większość tokenów wygasa po określonym czasie (np. 60 dni) i wymaga ręcznego odnowienia.

## Procedura Ogólna

1.  Wygeneruj nowy token na odpowiednim portalu developerskim.
2.  Zaloguj się na VPS przez SSH.
3.  Edytuj plik `.env`:
    ```bash
    nano /srv/hbrl/OmniPost/backend/.env
    ```
4.  Podmień stary token na nowy.
5.  Zrestartuj backend OmniPost:
    ```bash
    pm2 restart omnipost-backend
    ```

---

## 1. Meta (Facebook / Instagram)

*   **Token:** `FB_ACCESS_TOKEN`, `IG_ACCESS_TOKEN`
*   **Ważność:** ok. 60 dni (Long-Lived Token).
*   **Generowanie:**
    1.  Wejdź na [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
    2.  Wybierz swoją aplikację OmniPost.
    3.  Wybierz uprawnienia (Permissions):
        *   `pages_manage_posts`, `pages_read_engagement` (Facebook)
        *   `instagram_basic`, `instagram_content_publish` (Instagram)
    4.  Wygeneruj "User Access Token".
    5.  Wymień go na "Long-Lived Access Token" używając przycisku "Open in Access Token Tool" lub endpointu `/oauth/access_token`.

## 2. LinkedIn

*   **Token:** `LI_ACCESS_TOKEN`
*   **Ważność:** 60 dni.
*   **Generowanie:**
    1.  Wejdź na [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps).
    2.  Wybierz aplikację.
    3.  W zakładce "Auth" użyj "OAuth 2.0 Tools" (jeśli dostępne) lub wygeneruj token przez Postmana (Authorization Code Flow).
    4.  Zakresy (Scopes): `w_member_social`, `r_liteprofile`.

## 3. TikTok

*   **Token:** `TIKTOK_ACCESS_TOKEN`
*   **Ważność:** Zależy od typu aplikacji (zazwyczaj wymaga odświeżania Refresh Tokenem, ale w obecnej wersji MVP używamy statycznego tokenu z panelu lub długotrwałego).
*   **Generowanie:**
    1.  [TikTok for Developers](https://developers.tiktok.com/).
    2.  Wygeneruj Access Token w ustawieniach aplikacji lub przez proces OAuth.

## 4. Twitter / X

*   **Token:** `X_ACCESS_TOKEN` (OAuth 2.0) lub `TW_ACCESS_TOKEN` (OAuth 1.0a).
*   **Ważność:** OAuth 2.0 (2 godziny + Refresh Token), OAuth 1.0a (Nie wygasa).
*   **Generowanie:**
    1.  [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard).
    2.  Wygeneruj "Access Token and Secret" (dla OAuth 1.0a) lub Bearer Token (dla OAuth 2.0).
    3.  Zalecane OAuth 1.0a dla prostoty (brak wygasania), jeśli API na to pozwala.

## 5. Inne Platformy (Webhooki)

*   **Discord:** `DISCORD_WEBHOOK_URL` - Nie wygasa, chyba że zostanie usunięty w Discordzie.
*   **Telegram:** `TELEGRAM_WEBHOOK_URL` - Bot token nie wygasa, dopóki nie zostanie zresetowany u BotFathera.
