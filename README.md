# 🎮 Sudoku Game

Un'applicazione web interattiva per giocare a Sudoku con interfaccia moderna, supporto multilingue e modalità scura.

[🌐 Gioca ora](https://sudoku.egenesio.com) | [🔗 GitHub](https://github.com/acrazypie/sudoku-game)

## ✨ Caratteristiche

- 🎯 **5 Livelli di Difficoltà**: Easy, Medium, Expert, Master, Extreme
- 🌍 **Multilingue**: Supporto per English, Italiano, Français, Deutsch, Español, 日本語
- 🌙 **Modalità Scura**: Tema chiaro e scuro con colori coerenti e rilassanti
- 📱 **Mobile Responsive**: Perfettamente ottimizzato per dispositivi mobili e tablet
- ⏱️ **Timer Integrato**: Monitora il tuo tempo di gioco
- 💡 **Suggerimenti**: 2 suggerimenti per puzzle per guidarti quando sei bloccato
- ↩️ **Annulla**: Annulla l'ultima mossa con un click
- 🎨 **Interfaccia Intuitiva**: Numpad integrato e evidenziazione automatica
- ✅ **Validazione in Tempo Reale**: Feedback immediato su mosse sbagliate

## 🚀 Come Giocare

1. Seleziona il livello di difficoltà
2. Clicca su "Start" per iniziare una nuova partita
3. Clicca su una cella vuota per selezionarla
4. Scegli un numero dal numpad in basso
5. Il gioco verificherà automaticamente se il numero è corretto
6. Completa la griglia di Sudoku per vincere!

### Controlli

- **Click su una cella**: Seleziona la cella
- **Numpad**: Inserisci i numeri (1-9)
- **Undo**: Annulla l'ultima mossa
- **Hint**: Richiedi un suggerimento (massimo 2 per puzzle)
- **Click su celle completate**: Evidenzia tutti i numeri uguali

## 🛠️ Tecnologie Utilizzate

- **HTML5**: Struttura semantica
- **CSS3**: Styling responsivo con grid layout
- **JavaScript (ES6+)**: Logica di gioco modulare
- **sudoku.js**: Generatore di puzzle sudoku (basato su [robatron/sudoku.js](https://github.com/robatron/sudoku.js))

## 📁 Struttura del Progetto

```
sudoku-game/
├── index.html              # File HTML principale
├── css/
│   └── style.css          # Stili e responsive design
├── js/
│   ├── script.js          # Logica principale del gioco
│   ├── sudoku.js          # Generatore e risolutore di puzzle
│   ├── lang.js            # Gestione lingua e localizzazione
│   └── theme.js           # Gestione tema chiaro/scuro
├── lang/
│   ├── en.json            # Traduzioni inglese
│   ├── it.json            # Traduzioni italiano
│   ├── fr.json            # Traduzioni francese
│   ├── de.json            # Traduzioni tedesco
│   ├── es.json            # Traduzioni spagnolo
│   └── ja.json            # Traduzioni giapponese
├── icons/
│   └── icon.png           # Favicon
└── README.md              # Questo file
```

## 🎮 Livelli di Difficoltà

| Livello     | Celle Date | Descrizione               |
| ----------- | ---------- | ------------------------- |
| **Easy**    | 62         | Perfetto per principianti |
| **Medium**  | 52         | Una sfida moderata        |
| **Expert**  | 42         | Per giocatori esperti     |
| **Master**  | 32         | Molto impegnativo         |
| **Extreme** | 22         | La massima difficoltà     |

## 🌐 Lingue Supportate

- 🇬🇧 English
- 🇮🇹 Italiano
- 🇫🇷 Français
- 🇩🇪 Deutsch
- 🇪🇸 Español
- 🇯🇵 日本語

La lingua viene selezionata automaticamente in base alle preferenze del browser. È possibile cambiarla manualmente dal menu nel header.

## 🎨 Temi

- **Modalità Chiara**: Tema luminoso con colori pastello per il gioco durante il giorno
- **Modalità Scura**: Tema verde rilassante per giocare durante la notte

La preferenza del tema viene salvata nel localStorage.

## 📱 Responsività

L'applicazione è completamente responsive:

- ✅ Desktop (1024px+)
- ✅ Tablet (768px - 1023px)
- ✅ Mobile (< 768px)

Le dimensioni delle celle e il layout si adattano automaticamente alla dimensione dello schermo.

## 🔒 Funzionalità di Gioco

### Convalida

- Il gioco verifica automaticamente se i numeri inseriti sono corretti
- Massimo 3 errori prima di game over
- Errore evidenziato con animazione di scuotimento

### Suggerimenti Intelligenti

- 2 suggerimenti per puzzle
- Un suggerimento riempie una cella con il numero corretto

### Evidenziazione

- La riga, colonna e riquadro della cella selezionata vengono evidenziati
- I numeri uguali sulla griglia vengono evidenziati
- Le celle correlate hanno sfondo tintato per chiarezza

## 💾 Salvataggio Stato

L'app salva automaticamente:

- Lingua preferita
- Tema preferito (chiaro/scuro)
- Livello di difficoltà selezionato

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

- **Generatore Sudoku**: Basato su [sudoku.js](https://github.com/robatron/sudoku.js) di robatron
- **Icone**: Bootstrap Icons
- **Font**: Outfit

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
