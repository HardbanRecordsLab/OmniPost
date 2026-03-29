# Platform Adapter Registry

## Włączenie
- Flaga: `USE_NEW_PLATFORM_ADAPTERS=false` (domyślnie wyłączone) w pliku [.env](file:///g:/omnipost---social-media-scheduler/.env).
- Po ustawieniu na `true`, backend może korzystać z rejestru adapterów.

## Struktura
- [src/platforms/adapters/base/PlatformAdapter.ts](file:///g:/omnipost---social-media-scheduler/src/platforms/adapters/base/PlatformAdapter.ts)
- [src/platforms/adapters/PlatformRegistry.ts](file:///g:/omnipost---social-media-scheduler/src/platforms/adapters/PlatformRegistry.ts)
- [src/platforms/adapters/others/TelegramAdapter.ts](file:///g:/omnipost---social-media-scheduler/src/platforms/adapters/others/TelegramAdapter.ts)
- [src/platforms/adapters/others/DiscordAdapter.ts](file:///g:/omnipost---social-media-scheduler/src/platforms/adapters/others/DiscordAdapter.ts)
- Foldery: meta, tiktok, linkedin, twitter, youtube, others.

## Rejestracja konta
- Dodaj adapter dla platformy: implementacja klasy rozszerzającej `BaseAdapter`.
- Zarejestruj adapter w `PlatformRegistry` przez `register('telegram', new TelegramAdapter())`.
- Ustaw dane połączenia w środowisku:
  - `TELEGRAM_WEBHOOK_URL=https://...`
  - `DISCORD_WEBHOOK_URL=https://...`

## Standard adaptera
- `validateContent(post)`: szybka walidacja długości/treści.
- `publish(post)`: wysyłka posta i zwrot `externalId`.
- `handleErrors(error, post)`: strategia retry dla kodów 190, 368, 100.

## Podłączenie nowych kont
- Utwórz nowy plik adaptera w odpowiednim folderze.
- Dodaj wymagane sekrety API w `.env.local` backendu.
- Zarejestruj adapter w rejestrze (gdy flaga `USE_NEW_PLATFORM_ADAPTERS=true`).
