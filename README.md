# 🎮 Sudoku Game

Un'applicazione web interattiva per giocare a Sudoku con interfaccia moderna, supporto multilingue e modalità scura.

[🌐 Gioca ora](https://sudoku.egenesio.com) | [🔗 GitHub](https://github.com/acrazypie/sudoku-game)

## ✨ Caratteristiche

- 🎯 **6 livelli**: Easy, Medium, Hard, Expert, Master, Extreme, graduati in base alle tecniche logiche necessarie (non solo al numero di celle date)
- 🧩 **Generatore vero**: ogni puzzle viene generato al momento ed ha una sola soluzione
- 📅 **Sfida del giorno**: un puzzle al giorno uguale per tutti, calendario mensile e trofei per i mesi completati
- ✏️ **Note**: modalità matita, con rimozione automatica delle note quando inserisci un numero
- 💡 **Aiuti intelligenti**: 3 per partita; correggono prima un numero sbagliato, poi spiegano la mossa logica successiva (singolo nudo / nascosto, coppie...)
- ↩️ **Annulla** illimitato e **Cancella**
- ❌ **Errori**: limite di 3 (disattivabile), con una seconda possibilità
- 🏆 **Punteggio**: punti per ogni numero giusto, bonus per righe/colonne/riquadri completati, bonus tempo e bonus zero errori
- 📊 **Statistiche** per livello: partite, vittorie, percentuale, miglior tempo, tempo medio, serie di vittorie, miglior punteggio
- ⏸️ **Pausa** (automatica quando cambi scheda) e salvataggio automatico della partita
- ⚙️ **Impostazioni**: controllo errori, evidenziazioni, timer, suoni
- 💾 **Esporta / importa** i progressi per spostarli su un altro dispositivo
- ⌨️ **Tastiera** completa, 🌍 6 lingue, 🌙 tema chiaro/scuro, 📱 installabile e giocabile offline (PWA)

## 🚀 Come Giocare

1. Scegli un livello (o la sfida del giorno)
2. Tocca una cella, poi un numero
3. Attiva le **Note** per segnare i candidati
4. Completa la griglia: ogni riga, colonna e riquadro 3×3 contiene i numeri da 1 a 9

### Tastiera

| Tasto | Azione |
| --- | --- |
| `1`–`9` | inserisci un numero |
| `Shift` + `1`–`9` | scrivi una nota |
| frecce | muoviti |
| `Backspace` | cancella |
| `N` | note sì / no |
| `Ctrl` + `Z` | annulla |
| `H` | aiuto |
| `Spazio` | pausa |

## 🛠️ Tecnologie Utilizzate

Solo HTML, CSS e JavaScript (moduli ES), senza build e senza dipendenze. Tutti i dati restano nel `localStorage` del browser.

## 📁 Struttura del Progetto

```
sudoku-game/
├── index.html
├── manifest.webmanifest   # PWA
├── sw.js                  # cache offline
├── css/style.css
├── js/
│   ├── engine.js          # generatore, risolutore, valutazione difficoltà, aiuti
│   ├── game.js            # interfaccia e logica di gioco
│   ├── store.js           # salvataggi (localStorage)
│   ├── sound.js           # effetti sonori sintetizzati
│   ├── lang.js            # traduzioni
│   └── theme.js           # tema chiaro/scuro
├── lang/                  # en, it, fr, de, es, ja
├── fonts/                 # Syne + DM Mono (OFL)
└── icons/
```

## 🎮 Livelli di Difficoltà

| Livello     | Celle date | Tecniche richieste                    |
| ----------- | ---------- | ------------------------------------- |
| **Easy**    | ~40        | singoli                               |
| **Medium**  | ~33        | singoli                               |
| **Hard**    | ~26–29     | candidati bloccati                    |
| **Expert**  | ~25–27     | coppie e terne                        |
| **Master**  | ~23–26     | oltre le tecniche base                |
| **Extreme** | ~22–25     | il minimo possibile di celle          |

## 🌐 Lingue Supportate

- 🇬🇧 English
- 🇮🇹 Italiano
- 🇫🇷 Français
- 🇩🇪 Deutsch
- 🇪🇸 Español
- 🇯🇵 日本語

La lingua viene selezionata automaticamente in base alle preferenze del browser. È possibile cambiarla manualmente dal menu nel header.

## 🎨 Temi

- Tema chiaro e scuro (segue quello del sistema, oppure scegli tu)

## 🐛 Problemi Noti

Nessuno al momento! Se trovi un bug, per favore segnalalo su [GitHub Issues](https://github.com/acrazypie/sudoku-game/issues).

## 🤝 Contributi

I contributi sono benvenuti! Se desideri migliorare l'app:

1. Fork il progetto
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Commit i tuoi cambiamenti (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📝 Licenza

Questo progetto è distribuito sotto la licenza [MIT](LICENSE).

## 🙏 Riconoscimenti

- **Ispirazione**: la prima versione usava [sudoku.js](https://github.com/robatron/sudoku.js) di robatron
- **Font**: Syne e DM Mono (SIL Open Font License)

## ☕ Supporta lo Sviluppatore

Se ti piace questo progetto e desideri supportarmi:

- ⭐ Stellina su GitHub
- 🐦 Condividi con gli amici
- ☕ [Offrimi un caffè](https://ko-fi.com/egenesio)

## 📧 Contatti

- 🌐 [Sito Personale](https://egenesio.com)
- 💼 [GitHub](https://github.com/acrazypie)
- ☕ [Ko-fi](https://ko-fi.com/egenesio)

---

**Enjoy your Sudoku experience! 🎮**
