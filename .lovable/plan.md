# Piano di implementazione

Lavoro grosso, lo divido in blocchi logici. Confermami prima di partire.

## A. Coach AI + Dashboard cerchi (richiesta principale)

**Nuova schermata Coach in `/app`** (sostituisce o affianca lo storico attuale):
- **Cerchio calorie giornaliere**: somma kcal di oggi vs target (default 2000 kcal, configurabile in profilo).
- **Cerchio idratazione**: ml di oggi vs target (default 2000 ml). Tre bottoni rapidi: **+250 ml**, **+500 ml**, **+750 ml** (correggo il tuo "+150" che immagino fosse refuso — confermami se invece vuoi 150).
- **Selettore pasto al caricamento foto**: quando carichi una foto in `/app`, prima dell'analisi appare un dialog "Che pasto stai facendo?" → Colazione / Pranzo / Cena / Spuntino. Il pasto viene salvato insieme all'analisi e raggruppato nel diario giornaliero.

**Backend**:
- Migration: aggiungo colonne `pasto text`, `kcal numeric` (estratta dal risultato per query veloci), `consumed_at date` su `analisi`.
- Nuova tabella `idratazione` (`user_id`, `data`, `ml`) con RLS.
- Nuova tabella `obiettivi` (o colonne su `profiles`): `target_kcal`, `target_ml`.
- Server fn: `getCoachOggi` (somma kcal + ml di oggi), `aggiungiIdratazione(ml)`, `setObiettivi`.

## B. Popup condivisione WhatsApp (punto 1)
Dopo ogni analisi completata (sia `/prova` che `/app`) mostro un `Dialog` shadcn:
- Titolo: "Ti è piaciuto? Condividi con un amico 🎁"
- Bottone verde WhatsApp → apre `https://wa.me/?text=...` con il testo precompilato che hai indicato.
- Dismissibile, riappare massimo 1 volta a sessione.

## C. Pagina `/auth` redesign (punto 2)
- "Continua con Google" diventa il bottone grande primario in cima (full width, alto, verde lime).
- Email/password spostati sotto un divider "oppure con email", form rimpicciolito.

## D. Landing page — social proof (punti 3, 4)
- **Contatore analisi totali**: badge sotto l'hero "X analisi già effettuate". Nuova server fn pubblica `getAnalisiCount` (usa `supabaseAdmin`, query `count` su `analisi`). Aggiornamento "in tempo reale" via Supabase Realtime sulla tabella `analisi` (abilito publication).
- **3 recensioni italiane**: sezione con card (nome, avatar generato, 5 stelle, testo breve). Avatar via DiceBear o iniziali colorate. Dati hardcoded credibili (Marco R., Giulia T., Luca M.).

## E. Trust badge pagamento (punto 5)
Vicino ai bottoni "Passa a Pro" / "Passa a Ristorante" nel pricing della home (e nella eventuale `/pricing`):
- Badge con icona scudo verde Lucide `ShieldCheck` + testo "Rimborso garantito entro 30 giorni, senza domande".

## F. Pagina `/pricing` dedicata (punto 6)
Creo route `/pricing` (oggi i prezzi sono solo nella sezione `#prezzi` della home). Stessi 3 piani + sotto ogni piano:
- ✓ Annulla quando vuoi
- ✓ Nessun contratto
- ✓ Supporto via email incluso
- In cima: "Usato da X utenti" (count utenti da `profiles`).

Aggiungo link `/pricing` nella navbar.

## G. Banner countdown lancio (punto 7)
Banner sticky in cima a tutte le pagine pubbliche (sopra la navbar):
- "🎁 Offerta lancio — Primo mese a €3.99 invece di €7. Scade tra Xh Ym Zs"
- Countdown calcolato verso una data fissa (es. 7 giorni da ora, salvata in `localStorage` alla prima visita per essere coerente per utente). Quando scade, banner sparisce.
- Dismissibile con X, ricompare al refresh entro la scadenza.

## Ordine di esecuzione
Eseguo nell'ordine numerico tuo: **1 → 2 → 3 → 4 → 5 → 6 → 7**, e poi il blocco A (Coach + cerchi + selettore pasto + idratazione) come ultimo step grosso.

## Domande prima di iniziare
1. **+150 o +500 ml**? Per i bottoni idratazione il terzo valore (+150) è insolito, di solito è +500. Confermi o tengo +150?
2. **Target kcal/idratazione**: vado con default 2000 kcal e 2000 ml modificabili in un menu impostazioni, ok?
3. **Banner countdown**: la durata "7 giorni dalla prima visita per utente" va bene, o vuoi una **data fissa globale** (es. scade il 30/06/2026 per tutti)?
4. **Prezzo offerta lancio**: mostro €3.99 sul piano Pro (oggi €9.99). Devo anche creare il prezzo Stripe scontato o per ora è solo marketing visivo?
