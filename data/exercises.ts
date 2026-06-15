export type MuscleGroup =
  | 'Brust' | 'Rücken' | 'Schultern' | 'Bizeps' | 'Trizeps'
  | 'Beine' | 'Gesäß' | 'Core' | 'Waden' | 'Unterarme' | 'Ganzkörper' | 'Cardio'

export type Equipment =
  | 'Langhantel' | 'Kurzhantel' | 'Kabelzug' | 'Maschine' | 'Körpergewicht'
  | 'Stange' | 'Kettlebell' | 'Widerstandsband' | 'Smith Machine' | 'Dip-Station' | 'Laufband' | 'Fahrrad'

export interface Exercise {
  id: string
  name: string
  muscle: MuscleGroup
  secondary?: MuscleGroup[]
  equipment: Equipment
  difficulty: 'Anfänger' | 'Fortgeschritten' | 'Profi'
  instructions: string
  tips?: string
  sets_recommended?: string
  reps_recommended?: string
}

export const EXERCISES: Exercise[] = [
  // ── BRUST ─────────────────────────────────────────────────────────────────
  { id: 'b001', name: 'Flachbankdrücken', muscle: 'Brust', secondary: ['Trizeps', 'Schultern'], equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Lege dich flach auf die Bank. Griffbreite etwas mehr als schulterbreit. Stange zur Brust senken, vollständig drücken.', tips: 'Schulterblätter zusammenziehen und in die Bank drücken.', sets_recommended: '3–5', reps_recommended: '5–10' },
  { id: 'b002', name: 'Schrägbankdrücken (Incline)', muscle: 'Brust', secondary: ['Schultern', 'Trizeps'], equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Bank auf 30–45° einstellen. Stange zur oberen Brust senken und explosiv drücken.', tips: 'Obere Brust und Schlüsselbein anvisieren.', sets_recommended: '3–4', reps_recommended: '8–12' },
  { id: 'b003', name: 'Schrägbankdrücken (Decline)', muscle: 'Brust', secondary: ['Trizeps'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Bank leicht nach unten neigen. Untere Brustpartie betonen.', sets_recommended: '3–4', reps_recommended: '8–12' },
  { id: 'b004', name: 'Flachbank-KH-Drücken', muscle: 'Brust', secondary: ['Trizeps', 'Schultern'], equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Mit Kurzhanteln flach auf der Bank. Handflächen zeigen zueinander oder nach vorne. Vollständig drücken.', sets_recommended: '3–4', reps_recommended: '8–15' },
  { id: 'b005', name: 'Schrägbank-KH-Drücken', muscle: 'Brust', secondary: ['Schultern'], equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Wie Kurzhanteldrücken, aber auf 30–45° geneigter Bank.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'b006', name: 'Fliegende (Kurzhantel)', muscle: 'Brust', equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Auf der Bank liegend, Arme leicht gebeugt weit öffnen und über der Brust zusammenführen.', tips: 'Wie eine große Umarmung – Ellbogen leicht gebeugt halten.', sets_recommended: '3–4', reps_recommended: '12–15' },
  { id: 'b007', name: 'Kabelfliegende (Cable Fly)', muscle: 'Brust', equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Kabel auf Schulterhöhe einstellen. Von der Seite zur Mitte führen und Brust anspannen.', sets_recommended: '3–4', reps_recommended: '12–20' },
  { id: 'b008', name: 'High Cable Fly', muscle: 'Brust', equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Kabel hoch einstellen. Von oben nach unten zusammenführen – untere Brust betonen.', sets_recommended: '3', reps_recommended: '15–20' },
  { id: 'b009', name: 'Low Cable Fly', muscle: 'Brust', equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Kabel unten einstellen. Von unten nach oben zusammenführen – obere Brust betonen.', sets_recommended: '3', reps_recommended: '15–20' },
  { id: 'b010', name: 'Butterfly (Pec Deck)', muscle: 'Brust', equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'An der Maschine sitzen, Arme auf die Polster legen und zur Mitte zusammenführen.', sets_recommended: '3–4', reps_recommended: '12–20' },
  { id: 'b011', name: 'Liegestütze', muscle: 'Brust', secondary: ['Trizeps', 'Schultern', 'Core'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Klassische Liegestütze: Körper gerade, Hände schulterbreit, Brust bis kurz über den Boden.', tips: 'Core die ganze Zeit anspannen.', sets_recommended: '3–4', reps_recommended: '10–25' },
  { id: 'b012', name: 'Enge Liegestütze', muscle: 'Brust', secondary: ['Trizeps'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Hände eng zusammen – betont Trizeps und innere Brust.', sets_recommended: '3', reps_recommended: '10–20' },
  { id: 'b013', name: 'Schrägbank-Liegestütze', muscle: 'Brust', secondary: ['Schultern'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Füße erhöht auf einer Bank – obere Brust wird mehr betont.', sets_recommended: '3', reps_recommended: '10–20' },
  { id: 'b014', name: 'Dips (Brust)', muscle: 'Brust', secondary: ['Trizeps', 'Schultern'], equipment: 'Dip-Station', difficulty: 'Fortgeschritten', instructions: 'Körper leicht nach vorne neigen, tief sinken lassen. Mehr Neigung = mehr Brust.', sets_recommended: '3–4', reps_recommended: '8–15' },
  { id: 'b015', name: 'Bankdrücken eng (Close-Grip)', muscle: 'Brust', secondary: ['Trizeps'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Griffbreite schulterbreit oder enger. Betont Trizeps und innere Brust.', sets_recommended: '3–4', reps_recommended: '8–12' },
  { id: 'b016', name: 'Smith Machine Bankdrücken', muscle: 'Brust', secondary: ['Trizeps'], equipment: 'Smith Machine', difficulty: 'Anfänger', instructions: 'In der Smith Machine flach drücken – sicherer für Anfänger.', sets_recommended: '3–4', reps_recommended: '8–15' },
  { id: 'b017', name: 'Chest Press Maschine', muscle: 'Brust', secondary: ['Trizeps'], equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'An der Brustdrückmaschine sitzen und drücken.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'b018', name: 'Pullover (Kurzhantel)', muscle: 'Brust', secondary: ['Rücken'], equipment: 'Kurzhantel', difficulty: 'Fortgeschritten', instructions: 'Quer auf der Bank liegen. Kurzhantel mit beiden Händen über den Kopf senken und zurückführen.', sets_recommended: '3', reps_recommended: '10–15' },

  // ── RÜCKEN ────────────────────────────────────────────────────────────────
  { id: 'r001', name: 'Kreuzheben', muscle: 'Rücken', secondary: ['Beine', 'Gesäß', 'Core'], equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Füße hüftbreit, Stange über Mittelfuß. Rücken gerade halten, mit Hüfte und Knie gleichzeitig strecken.', tips: 'Schulterblätter zurückziehen, Bauch anspannen. Rücken NIEMALS runden.', sets_recommended: '3–5', reps_recommended: '3–8' },
  { id: 'r002', name: 'Rumänisches Kreuzheben', muscle: 'Rücken', secondary: ['Gesäß', 'Beine'], equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Beine leicht gebeugt, Hüfte nach hinten schieben während die Stange die Beine entlang gleitet.', sets_recommended: '3–4', reps_recommended: '8–12' },
  { id: 'r003', name: 'Klimmzüge (Overhand)', muscle: 'Rücken', secondary: ['Bizeps'], equipment: 'Stange', difficulty: 'Fortgeschritten', instructions: 'Pronierter Griff, schulterbreit oder weiter. Brust zur Stange ziehen, kontrolliert senken.', tips: 'Schulterblätter zuerst runterziehen, dann Ellbogen.', sets_recommended: '3–5', reps_recommended: '5–12' },
  { id: 'r004', name: 'Klimmzüge (Underhand / Chin-Up)', muscle: 'Rücken', secondary: ['Bizeps'], equipment: 'Stange', difficulty: 'Fortgeschritten', instructions: 'Supinierter Griff, etwas enger. Mehr Bizeps-Aktivierung als Overhand.', sets_recommended: '3–4', reps_recommended: '6–12' },
  { id: 'r005', name: 'Latzug vorne', muscle: 'Rücken', secondary: ['Bizeps'], equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Breiten Griff nehmen. Stange zur oberen Brust ziehen, Ellbogen nach unten führen.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'r006', name: 'Latzug eng', muscle: 'Rücken', secondary: ['Bizeps'], equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Enger neutraler Griff. Stange zur Brust ziehen – betont mittleren Rücken.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'r007', name: 'Langhantelrudern', muscle: 'Rücken', secondary: ['Bizeps', 'Core'], equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Rumpf 45° vorgebeugt, Rücken gerade. Stange zum Bauchnabel ziehen, Schulterblätter zusammenführen.', tips: 'Hüfte stabil halten – nicht schwingen.', sets_recommended: '3–5', reps_recommended: '6–12' },
  { id: 'r008', name: 'T-Bar Rudern', muscle: 'Rücken', secondary: ['Bizeps'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'T-Bar oder Stange in der Ecke fixieren. Gewicht zum Körper ziehen.', sets_recommended: '3–4', reps_recommended: '8–12' },
  { id: 'r009', name: 'Kurzhantelrudern einarmig', muscle: 'Rücken', secondary: ['Bizeps'], equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Knie auf der Bank abstützen, Kurzhantel bis zur Hüfte ziehen. Rücken gerade.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'r010', name: 'Sitzrudern am Kabel', muscle: 'Rücken', secondary: ['Bizeps'], equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Sitzen, Rücken gerade. Griff zum Bauch ziehen und Schulterblätter zusammenführen.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'r011', name: 'Rudermaschine', muscle: 'Rücken', secondary: ['Bizeps'], equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'Brust gegen die Polster, Griffe zum Körper ziehen.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'r012', name: 'Hyperextension', muscle: 'Rücken', secondary: ['Gesäß'], equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'Auf dem Rückenstrecker-Gerät, Oberkörper nach unten lassen und nach oben strecken.', sets_recommended: '3', reps_recommended: '12–20' },
  { id: 'r013', name: 'Good Mornings', muscle: 'Rücken', secondary: ['Gesäß', 'Beine'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Stange auf den Schultern, Hüfte nach hinten schieben, Oberkörper nach vorne beugen.', sets_recommended: '3', reps_recommended: '10–15' },
  { id: 'r014', name: 'Facepull', muscle: 'Rücken', secondary: ['Schultern'], equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Kabel auf Kopfhöhe, Seil zum Gesicht ziehen. Ellbogen weit oben halten.', sets_recommended: '3–4', reps_recommended: '15–20' },
  { id: 'r015', name: 'Inverted Row', muscle: 'Rücken', secondary: ['Bizeps'], equipment: 'Stange', difficulty: 'Anfänger', instructions: 'Unter einer niedrigen Stange hängen, Brust zur Stange ziehen.', sets_recommended: '3', reps_recommended: '10–15' },
  { id: 'r016', name: 'Shrugs (Langhantel)', muscle: 'Rücken', secondary: [], equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Schultern so hoch wie möglich heben und kurz halten. Trapez betonen.', sets_recommended: '3–4', reps_recommended: '12–20' },
  { id: 'r017', name: 'Shrugs (Kurzhantel)', muscle: 'Rücken', equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Wie Langhantel-Shrugs aber mit Kurzhanteln für mehr Bewegungsfreiheit.', sets_recommended: '3–4', reps_recommended: '12–20' },
  { id: 'r018', name: 'Rack Pull', muscle: 'Rücken', secondary: ['Gesäß'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Kreuzheben aus dem Rack – Stange auf Knöchelhöhe. Weniger Bewegungsumfang, mehr Gewicht möglich.', sets_recommended: '3–5', reps_recommended: '3–8' },

  // ── SCHULTERN ─────────────────────────────────────────────────────────────
  { id: 's001', name: 'Schulterdrücken (Langhantel)', muscle: 'Schultern', secondary: ['Trizeps'], equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Stehend oder sitzend. Stange von Schulterhöhe über den Kopf drücken.', tips: 'Core anspannen, Rücken nicht durchdrücken.', sets_recommended: '3–5', reps_recommended: '5–10' },
  { id: 's002', name: 'Schulterdrücken (Kurzhantel)', muscle: 'Schultern', secondary: ['Trizeps'], equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Kurzhanteln auf Schulterhöhe, über den Kopf drücken und oben zusammenführen.', sets_recommended: '3–4', reps_recommended: '8–15' },
  { id: 's003', name: 'Militärpress', muscle: 'Schultern', secondary: ['Trizeps', 'Core'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Stehend, enger Griff. Stange von der Brust über den Kopf drücken. Komplex und effektiv.', sets_recommended: '3–5', reps_recommended: '5–8' },
  { id: 's004', name: 'Arnold Press', muscle: 'Schultern', secondary: ['Trizeps'], equipment: 'Kurzhantel', difficulty: 'Fortgeschritten', instructions: 'Start mit Handflächen zu dir, beim Drücken nach außen drehen.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 's005', name: 'Seitheben', muscle: 'Schultern', equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Arme leicht gebeugt seitlich bis Schulterhöhe heben. Mittlerer Deltamuskel.', tips: 'Kontrolliert senken, nicht schwingen.', sets_recommended: '3–5', reps_recommended: '12–20' },
  { id: 's006', name: 'Frontheben', muscle: 'Schultern', equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Kurzhantel nach vorne bis Schulterhöhe heben. Vorderer Deltamuskel.', sets_recommended: '3', reps_recommended: '12–15' },
  { id: 's007', name: 'Reverse Fly', muscle: 'Schultern', secondary: ['Rücken'], equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Vorgebeugt, Arme seitlich nach hinten heben. Hinterer Deltamuskel.', sets_recommended: '3–4', reps_recommended: '12–20' },
  { id: 's008', name: 'Kabel-Seitheben', muscle: 'Schultern', equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Kabel unten einstellen, seitlich heben. Konstantere Spannung als Kurzhantel.', sets_recommended: '3–4', reps_recommended: '15–20' },
  { id: 's009', name: 'Upright Row', muscle: 'Schultern', secondary: ['Bizeps', 'Rücken'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Stange eng greifen, zum Kinn ziehen. Ellbogen über die Stange führen.', sets_recommended: '3', reps_recommended: '10–15' },
  { id: 's010', name: 'Schulterdrücken (Maschine)', muscle: 'Schultern', equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'An der Schulterdrückmaschine sitzen und drücken.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 's011', name: 'Pike Push-Up', muscle: 'Schultern', secondary: ['Trizeps'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Hüfte hoch, A-Form. Kopf Richtung Boden senken. Schulter-Liegestütze.', sets_recommended: '3', reps_recommended: '10–15' },
  { id: 's012', name: 'Handstand Push-Up', muscle: 'Schultern', secondary: ['Trizeps', 'Core'], equipment: 'Körpergewicht', difficulty: 'Profi', instructions: 'Im Handstand an der Wand den Kopf zum Boden senken und zurückdrücken.', sets_recommended: '3–5', reps_recommended: '5–10' },

  // ── BIZEPS ────────────────────────────────────────────────────────────────
  { id: 'bz001', name: 'Bizepscurl (Langhantel)', muscle: 'Bizeps', equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Stange schulterbreit, Ellbogen am Körper fixiert. Zur Schulter curlen.', sets_recommended: '3–4', reps_recommended: '8–12' },
  { id: 'bz002', name: 'Bizepscurl (Kurzhantel)', muscle: 'Bizeps', equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Abwechselnd oder gleichzeitig curlen. Ellbogen fixiert.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'bz003', name: 'Hammercurl', muscle: 'Bizeps', secondary: ['Unterarme'], equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Handflächen zeigen zueinander (neutraler Griff). Betont Brachialis und Unterarme.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'bz004', name: 'Konzentrationscurl', muscle: 'Bizeps', equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Ellbogen am inneren Oberschenkel abstützen. Maximale Kontraktion oben.', sets_recommended: '3', reps_recommended: '12–15' },
  { id: 'bz005', name: 'Prediger-Curl (Preacher Curl)', muscle: 'Bizeps', equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Arm auf dem Predigerpult, vollständig strecken und curlen.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'bz006', name: 'Kabel-Curl', muscle: 'Bizeps', equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Am Kabelzug unten. Konstante Spannung auf dem Bizeps.', sets_recommended: '3–4', reps_recommended: '12–20' },
  { id: 'bz007', name: 'Schrägbank-Curl', muscle: 'Bizeps', equipment: 'Kurzhantel', difficulty: 'Fortgeschritten', instructions: 'Auf Schrägbank zurücklehnen. Langer Bizepskopf wird besonders gedehnt.', sets_recommended: '3', reps_recommended: '10–15' },
  { id: 'bz008', name: 'EZ-Bar Curl', muscle: 'Bizeps', equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'EZ-Stange für weniger Handgelenkbelastung. Wie normaler Curl.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'bz009', name: 'Reverse Curl', muscle: 'Bizeps', secondary: ['Unterarme'], equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Pronierter Griff (Handrücken oben). Betont Unterarme und Brachialis.', sets_recommended: '3', reps_recommended: '12–15' },
  { id: 'bz010', name: 'Chin-Up', muscle: 'Bizeps', secondary: ['Rücken'], equipment: 'Stange', difficulty: 'Fortgeschritten', instructions: 'Supinierter Griff, Kinn über die Stange. Sehr effektiv für Bizeps.', sets_recommended: '3–5', reps_recommended: '6–12' },

  // ── TRIZEPS ───────────────────────────────────────────────────────────────
  { id: 'tz001', name: 'Trizeps-Pushdown (Seil)', muscle: 'Trizeps', equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Kabel oben, Seil nach unten drücken. Ellbogen am Körper fixieren.', sets_recommended: '3–4', reps_recommended: '12–20' },
  { id: 'tz002', name: 'Trizeps-Pushdown (Stange)', muscle: 'Trizeps', equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Wie Seil-Pushdown aber mit gerader oder V-Stange. Mehr Gewicht möglich.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'tz003', name: 'Skull Crusher (EZ-Stange)', muscle: 'Trizeps', equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Auf der Bank liegend, Stange zur Stirn senken, Ellbogen fixiert, wieder strecken.', tips: 'Nur den Unterarm bewegen, Oberarm stabil halten.', sets_recommended: '3–4', reps_recommended: '8–12' },
  { id: 'tz004', name: 'Dips (Trizeps)', muscle: 'Trizeps', secondary: ['Brust', 'Schultern'], equipment: 'Dip-Station', difficulty: 'Fortgeschritten', instructions: 'Aufrecht bleiben für mehr Trizeps. Tief gehen, vollständig strecken.', sets_recommended: '3–4', reps_recommended: '8–15' },
  { id: 'tz005', name: 'Overhead Trizeps-Extension (Kurzhantel)', muscle: 'Trizeps', equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Kurzhantel mit beiden Händen über den Kopf halten, nach unten senken und strecken.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'tz006', name: 'Trizeps-Kickback', muscle: 'Trizeps', equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Körper vorgebeugt, Oberarm parallel zum Boden. Unterarm nach hinten strecken.', sets_recommended: '3', reps_recommended: '12–15' },
  { id: 'tz007', name: 'Close-Grip Bankdrücken', muscle: 'Trizeps', secondary: ['Brust'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Enger Griff (schulterbreit), betont Trizeps stark.', sets_recommended: '3–5', reps_recommended: '6–12' },
  { id: 'tz008', name: 'Bank-Dips', muscle: 'Trizeps', secondary: ['Schultern'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Hände auf einer Bank, Beine gestreckt oder gebeugt. Körper nach unten dichen.', sets_recommended: '3', reps_recommended: '12–20' },
  { id: 'tz009', name: 'Overhead Kabel-Extension', muscle: 'Trizeps', equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Kabel hinter dem Kopf, nach oben strecken. Langer Trizepskopf.', sets_recommended: '3–4', reps_recommended: '12–15' },
  { id: 'tz010', name: 'Diamond Push-Up', muscle: 'Trizeps', secondary: ['Brust'], equipment: 'Körpergewicht', difficulty: 'Fortgeschritten', instructions: 'Hände in Diamantform unter der Brust. Sehr effektiv für Trizeps.', sets_recommended: '3', reps_recommended: '10–20' },

  // ── BEINE ─────────────────────────────────────────────────────────────────
  { id: 'l001', name: 'Kniebeuge (Barbell Squat)', muscle: 'Beine', secondary: ['Gesäß', 'Core', 'Rücken'], equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Stange auf den oberen Trapez. Füße hüftbreit, Knie über die Zehen. Tief gehen, Rücken gerade.', tips: 'Knie nach außen drücken, Fersen am Boden. Königsübung!', sets_recommended: '3–5', reps_recommended: '5–10' },
  { id: 'l002', name: 'Front Squat', muscle: 'Beine', secondary: ['Core', 'Schultern'], equipment: 'Langhantel', difficulty: 'Profi', instructions: 'Stange vor dem Körper auf den Schultern. Aufrechter Oberkörper. Mehr Quads.', sets_recommended: '3–4', reps_recommended: '5–8' },
  { id: 'l003', name: 'Goblet Squat', muscle: 'Beine', secondary: ['Gesäß', 'Core'], equipment: 'Kettlebell', difficulty: 'Anfänger', instructions: 'Kettlebell oder Kurzhantel vor der Brust halten. Tiefe Kniebeuge, aufrechter Rücken.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'l004', name: 'Beinpresse', muscle: 'Beine', secondary: ['Gesäß'], equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'Füße auf die Plattform, unterschiedliche Fußpositionen trainieren unterschiedliche Muskeln. Beine vollständig strecken.', sets_recommended: '3–5', reps_recommended: '10–20' },
  { id: 'l005', name: 'Ausfallschritte (Walking Lunges)', muscle: 'Beine', secondary: ['Gesäß'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Großen Schritt nach vorne. Hinteres Knie bis kurz über den Boden. Aufrechter Rücken.', sets_recommended: '3–4', reps_recommended: '10–15 pro Bein' },
  { id: 'l006', name: 'Ausfallschritte mit Langhantel', muscle: 'Beine', secondary: ['Gesäß'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Wie normale Ausfallschritte aber mit Stange auf dem Rücken.', sets_recommended: '3–4', reps_recommended: '8–12 pro Bein' },
  { id: 'l007', name: 'Bulgarian Split Squat', muscle: 'Beine', secondary: ['Gesäß'], equipment: 'Kurzhantel', difficulty: 'Fortgeschritten', instructions: 'Hinteres Bein auf einer Bank. Vorderes Bein tiefe Kniebeuge. Sehr effektiv für Quads und Gesäß.', sets_recommended: '3–4', reps_recommended: '8–12 pro Bein' },
  { id: 'l008', name: 'Beinstrecker (Leg Extension)', muscle: 'Beine', equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'An der Maschine sitzen, Beine strecken. Isoliert die Quadrizeps.', sets_recommended: '3–4', reps_recommended: '12–20' },
  { id: 'l009', name: 'Beinbeuger (Leg Curl)', muscle: 'Beine', equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'Liegend oder sitzend an der Maschine. Bein beugen. Isoliert die Hamstrings.', sets_recommended: '3–4', reps_recommended: '12–15' },
  { id: 'l010', name: 'Sumo-Kniebeuge', muscle: 'Beine', secondary: ['Gesäß'], equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Breite Fußstellung, Zehen nach außen. Mehr Innenseite der Oberschenkel.', sets_recommended: '3–4', reps_recommended: '8–15' },
  { id: 'l011', name: 'Step-Ups', muscle: 'Beine', secondary: ['Gesäß'], equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Auf eine Box steigen. Abwechselnd pro Bein. Kurzhanteln für mehr Widerstand.', sets_recommended: '3', reps_recommended: '12–15 pro Bein' },
  { id: 'l012', name: 'Hack Squat', muscle: 'Beine', equipment: 'Maschine', difficulty: 'Fortgeschritten', instructions: 'Rücken an die Maschine anlehnen, tiefe Kniebeuge. Sehr isoliert für Quads.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'l013', name: 'Pistol Squat', muscle: 'Beine', secondary: ['Core'], equipment: 'Körpergewicht', difficulty: 'Profi', instructions: 'Einbeinige Kniebeuge, das andere Bein gestreckt nach vorne. Extreme Balance und Kraft nötig.', sets_recommended: '3', reps_recommended: '5–10 pro Bein' },
  { id: 'l014', name: 'Sissy Squat', muscle: 'Beine', equipment: 'Körpergewicht', difficulty: 'Fortgeschritten', instructions: 'Fersen erhöht, Knie weit nach vorne. Isoliert Quadrizeps extrem.', sets_recommended: '3', reps_recommended: '10–15' },
  { id: 'l015', name: 'Leg Press (schmal)', muscle: 'Beine', equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'Enge Fußstellung auf der Beinpresse betont die äußeren Quads.', sets_recommended: '3', reps_recommended: '12–15' },

  // ── GESÄSS ────────────────────────────────────────────────────────────────
  { id: 'g001', name: 'Hip Thrust', muscle: 'Gesäß', secondary: ['Beine'], equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Schultern auf der Bank, Stange auf der Hüfte. Hüfte explosiv nach oben drücken und oben anspannen.', tips: 'Die beste Übung für Gesäß überhaupt!', sets_recommended: '3–5', reps_recommended: '10–20' },
  { id: 'g002', name: 'Glute Bridge', muscle: 'Gesäß', secondary: ['Beine'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Auf dem Rücken, Füße aufgestellt. Hüfte nach oben drücken und oben anspannen.', sets_recommended: '3–4', reps_recommended: '15–25' },
  { id: 'g003', name: 'Sumo Deadlift', muscle: 'Gesäß', secondary: ['Beine', 'Rücken'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Breite Fußstellung, Zehen nach außen. Griff zwischen den Beinen. Mehr Gesäß als normales Kreuzheben.', sets_recommended: '3–5', reps_recommended: '5–8' },
  { id: 'g004', name: 'Cable Kickback', muscle: 'Gesäß', equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Kabel am Knöchel befestigen. Bein nach hinten kicken und Gesäß anspannen.', sets_recommended: '3–4', reps_recommended: '15–20 pro Bein' },
  { id: 'g005', name: 'Donkey Kicks', muscle: 'Gesäß', equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Im Vierfüßlerstand, Bein nach hinten oben heben. Gesäß anspannen.', sets_recommended: '3', reps_recommended: '15–20 pro Bein' },
  { id: 'g006', name: 'Fire Hydrant', muscle: 'Gesäß', equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Im Vierfüßlerstand, Bein seitlich nach außen heben.', sets_recommended: '3', reps_recommended: '15–20 pro Bein' },
  { id: 'g007', name: 'Clamshell', muscle: 'Gesäß', equipment: 'Widerstandsband', difficulty: 'Anfänger', instructions: 'Auf der Seite liegen, Band um die Knie. Oberes Knie wie Muschelschale öffnen.', sets_recommended: '3', reps_recommended: '20–25 pro Seite' },

  // ── CORE ──────────────────────────────────────────────────────────────────
  { id: 'c001', name: 'Plank', muscle: 'Core', equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Unterarme am Boden, Körper gerade wie ein Brett. Keine Hüfte hochziehen oder durchhängen.', tips: 'Bauch einziehen und anspannen. Atmen nicht vergessen.', sets_recommended: '3–5', reps_recommended: '30–60 Sek' },
  { id: 'c002', name: 'Side Plank', muscle: 'Core', equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Seitlich auf dem Unterarm, Körper in einer Linie. Seite des Core.', sets_recommended: '3', reps_recommended: '30–45 Sek pro Seite' },
  { id: 'c003', name: 'Crunches', muscle: 'Core', equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Auf dem Rücken, Knie gebeugt. Schultern leicht vom Boden heben und Bauch anspannen.', sets_recommended: '3–4', reps_recommended: '15–25' },
  { id: 'c004', name: 'Sit-Ups', muscle: 'Core', equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Vollständige Bewegung vom Boden zur aufrechten Position.', sets_recommended: '3–4', reps_recommended: '15–25' },
  { id: 'c005', name: 'Bicycle Crunches', muscle: 'Core', equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Abwechselnd Ellbogen zum gegenüberliegenden Knie. Rotationskomponente.', sets_recommended: '3', reps_recommended: '20–30' },
  { id: 'c006', name: 'Leg Raises', muscle: 'Core', equipment: 'Körpergewicht', difficulty: 'Fortgeschritten', instructions: 'Auf dem Rücken, Beine gerade heben und kontrolliert senken. Unterer Bauch.', sets_recommended: '3–4', reps_recommended: '12–20' },
  { id: 'c007', name: 'Hanging Leg Raises', muscle: 'Core', equipment: 'Stange', difficulty: 'Fortgeschritten', instructions: 'An der Klimmzugstange hängen, Beine bis 90° oder höher heben.', sets_recommended: '3–4', reps_recommended: '10–15' },
  { id: 'c008', name: 'Ab Wheel Rollout', muscle: 'Core', secondary: ['Schultern'], equipment: 'Körpergewicht', difficulty: 'Profi', instructions: 'Mit dem Ab-Wheel nach vorne rollen und kontrolliert zurückziehen.', sets_recommended: '3', reps_recommended: '8–15' },
  { id: 'c009', name: 'Russian Twist', muscle: 'Core', equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Sitzend, Rumpf drehen. Mit Gewichtsscheibe oder Medizinball für mehr Widerstand.', sets_recommended: '3', reps_recommended: '20–30' },
  { id: 'c010', name: 'Mountain Climbers', muscle: 'Core', secondary: ['Ganzkörper'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'In Liegestützposition, Knie abwechselnd zur Brust ziehen. Tempo kann variiert werden.', sets_recommended: '3', reps_recommended: '30–60 Sek' },
  { id: 'c011', name: 'Dragon Flag', muscle: 'Core', equipment: 'Körpergewicht', difficulty: 'Profi', instructions: 'An einer Bank festhalten, Körper gestreckt senken und heben. Extreme Core-Übung.', sets_recommended: '3', reps_recommended: '5–10' },
  { id: 'c012', name: 'Cable Crunch', muscle: 'Core', equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Kablo oben, kniend zum Boden crunchan. Mit Gewicht sehr effektiv.', sets_recommended: '3–4', reps_recommended: '12–20' },
  { id: 'c013', name: 'Dead Bug', muscle: 'Core', equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Auf dem Rücken, Arme und Beine gleichzeitig gestreckt senken und heben. Rücken am Boden.', sets_recommended: '3', reps_recommended: '10–15 pro Seite' },
  { id: 'c014', name: 'Hollow Body Hold', muscle: 'Core', equipment: 'Körpergewicht', difficulty: 'Fortgeschritten', instructions: 'Auf Rücken liegend, Arme und Beine gestreckt wenige cm vom Boden halten.', sets_recommended: '3', reps_recommended: '20–40 Sek' },
  { id: 'c015', name: 'Pallof Press', muscle: 'Core', equipment: 'Kabelzug', difficulty: 'Fortgeschritten', instructions: 'Kabel seitlich, gegen die Rotation drücken und zurückziehen. Anti-Rotations-Core.', sets_recommended: '3', reps_recommended: '12–15 pro Seite' },

  // ── WADEN ─────────────────────────────────────────────────────────────────
  { id: 'w001', name: 'Wadenheben stehend', muscle: 'Waden', equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'Stehend auf den Zehenspitzen hochheben, kurz halten, langsam senken.', sets_recommended: '4–5', reps_recommended: '15–25' },
  { id: 'w002', name: 'Wadenheben sitzend', muscle: 'Waden', equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'Sitzend – betont den Soleus unter dem Wadenmuskel.', sets_recommended: '4', reps_recommended: '15–25' },
  { id: 'w003', name: 'Einbeiniges Wadenheben', muscle: 'Waden', equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Auf einem Bein stehend an der Wand oder einer Treppe.', sets_recommended: '3–4', reps_recommended: '15–20 pro Bein' },
  { id: 'w004', name: 'Donkey Calf Raise', muscle: 'Waden', equipment: 'Maschine', difficulty: 'Fortgeschritten', instructions: 'Vorgebeugt an der Maschine – maximaler Bewegungsumfang für Waden.', sets_recommended: '4', reps_recommended: '15–25' },
  { id: 'w005', name: 'Box Jump Calf', muscle: 'Waden', secondary: ['Beine'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Sprünge aus den Waden – plyometrisch und funktional.', sets_recommended: '3', reps_recommended: '15–20' },

  // ── UNTERARME ─────────────────────────────────────────────────────────────
  { id: 'ua001', name: 'Wrist Curl (innen)', muscle: 'Unterarme', equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Unterarme auf den Knien, Handflächen oben. Handgelenke nach oben curlen.', sets_recommended: '3–4', reps_recommended: '15–20' },
  { id: 'ua002', name: 'Wrist Curl (außen)', muscle: 'Unterarme', equipment: 'Langhantel', difficulty: 'Anfänger', instructions: 'Handrücken oben, Handgelenke nach oben heben. Extensorenseite.', sets_recommended: '3', reps_recommended: '15–20' },
  { id: 'ua003', name: 'Farmer Walk', muscle: 'Unterarme', secondary: ['Ganzkörper', 'Core'], equipment: 'Kurzhantel', difficulty: 'Anfänger', instructions: 'Schwere Kurzhanteln in jeder Hand, aufrecht gehen. Griffkraft und Ganzkörper.', sets_recommended: '3–5', reps_recommended: '30–60 Meter' },
  { id: 'ua004', name: 'Dead Hang', muscle: 'Unterarme', secondary: ['Rücken'], equipment: 'Stange', difficulty: 'Anfänger', instructions: 'An der Klimmzugstange hängen und halten. Griffkraft verbessern.', sets_recommended: '3', reps_recommended: '30–60 Sek' },

  // ── GANZKÖRPER ────────────────────────────────────────────────────────────
  { id: 'gk001', name: 'Burpees', muscle: 'Ganzkörper', equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Liegestütz, aufspringen, Arme über den Kopf. Explosiv und konditionierend.', sets_recommended: '3–5', reps_recommended: '10–20' },
  { id: 'gk002', name: 'Thruster', muscle: 'Ganzkörper', secondary: ['Schultern', 'Beine'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Frontkniebeuge direkt in Schulterdrücken. Sehr intensiv.', sets_recommended: '3–5', reps_recommended: '8–12' },
  { id: 'gk003', name: 'Clean & Press', muscle: 'Ganzkörper', equipment: 'Langhantel', difficulty: 'Profi', instructions: 'Stange vom Boden in die Rack-Position reißen, dann über den Kopf drücken.', sets_recommended: '3–5', reps_recommended: '3–6' },
  { id: 'gk004', name: 'Kettlebell Swing', muscle: 'Ganzkörper', secondary: ['Gesäß', 'Rücken'], equipment: 'Kettlebell', difficulty: 'Anfänger', instructions: 'Kettlebell zwischen den Beinen schwingen, Hüfte explosiv strecken.', sets_recommended: '3–5', reps_recommended: '15–25' },
  { id: 'gk005', name: 'Box Jump', muscle: 'Ganzkörper', secondary: ['Beine'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Explosiv auf eine Box springen. Weich landen, kontrolliert zurücksteigen.', sets_recommended: '3–5', reps_recommended: '5–10' },
  { id: 'gk006', name: 'Battle Ropes', muscle: 'Ganzkörper', secondary: ['Schultern', 'Core'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Seile auf verschiedene Arten bewegen. Extrem konditionierend.', sets_recommended: '3–5', reps_recommended: '30–45 Sek' },
  { id: 'gk007', name: 'Sled Push', muscle: 'Ganzkörper', secondary: ['Beine', 'Core'], equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'Schlitten vor sich herschieben. Intensiv und funktional.', sets_recommended: '3–5', reps_recommended: '20–40 Meter' },

  // ── CARDIO ────────────────────────────────────────────────────────────────
  { id: 'ca001', name: 'Laufband', muscle: 'Cardio', equipment: 'Laufband', difficulty: 'Anfänger', instructions: 'Gehen, Joggen oder Sprinten. Geschwindigkeit und Steigung variieren.', sets_recommended: '1', reps_recommended: '20–60 Min' },
  { id: 'ca002', name: 'Fahrradergometer', muscle: 'Cardio', equipment: 'Fahrrad', difficulty: 'Anfänger', instructions: 'Gleichmäßig fahren oder Intervalle. Gelenkschonend.', sets_recommended: '1', reps_recommended: '20–45 Min' },
  { id: 'ca003', name: 'Rudergerät', muscle: 'Cardio', secondary: ['Rücken', 'Beine'], equipment: 'Maschine', difficulty: 'Anfänger', instructions: 'Beine strecken, Körper zurücklehnen, Arme ziehen. Ganzkörper-Cardio.', sets_recommended: '1', reps_recommended: '15–30 Min' },
  { id: 'ca004', name: 'Sprints (HIIT)', muscle: 'Cardio', equipment: 'Körpergewicht', difficulty: 'Fortgeschritten', instructions: '30 Sek Sprint, 90 Sek Pause. 6–10 Runden. Sehr effektiv für Fettverbrennung.', sets_recommended: '6–10', reps_recommended: '30 Sek' },
  { id: 'ca005', name: 'Jump Rope (Seilspringen)', muscle: 'Cardio', secondary: ['Waden'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Klassisches Seilspringen oder Double Unders für Fortgeschrittene.', sets_recommended: '3–5', reps_recommended: '2–5 Min' },

  // ── MEHR BRUST ────────────────────────────────────────────────────────────
  { id: 'b019', name: 'Landmine Press', muscle: 'Brust', secondary: ['Schultern'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Langhantelende in der Ecke. Diagonal drücken. Schulterschonend.', sets_recommended: '3', reps_recommended: '10–15' },
  { id: 'b020', name: 'Svend Press', muscle: 'Brust', equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Zwei Gewichtsscheiben zwischen den Handflächen. Vor der Brust nach vorne drücken.', sets_recommended: '3', reps_recommended: '15–20' },

  // ── MEHR RÜCKEN ───────────────────────────────────────────────────────────
  { id: 'r019', name: 'Snatch-Grip Deadlift', muscle: 'Rücken', secondary: ['Beine', 'Schultern'], equipment: 'Langhantel', difficulty: 'Profi', instructions: 'Sehr weiter Griff beim Kreuzheben. Oberer Rücken und Schultern stark betont.', sets_recommended: '3–4', reps_recommended: '5–8' },
  { id: 'r020', name: 'Pendlay Row', muscle: 'Rücken', secondary: ['Bizeps'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Stange vom Boden ziehen. Explosiv, Oberkörper parallel zum Boden.', sets_recommended: '3–5', reps_recommended: '5–8' },

  // ── MEHR SCHULTERN ────────────────────────────────────────────────────────
  { id: 's013', name: 'Cuban Press', muscle: 'Schultern', equipment: 'Kurzhantel', difficulty: 'Fortgeschritten', instructions: 'Kombination aus Außenrotation und Overhead Press. Für Schultergesundheit.', sets_recommended: '3', reps_recommended: '10–15' },
  { id: 's014', name: 'Prone Y-T-W-L', muscle: 'Schultern', secondary: ['Rücken'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Auf dem Bauch liegend, Arme in Y, T, W und L-Position heben. Schulterblattmuskeln.', sets_recommended: '3', reps_recommended: '10–15 pro Position' },

  // ── MEHR BEINE ────────────────────────────────────────────────────────────
  { id: 'l016', name: 'Reverse Lunge', muscle: 'Beine', secondary: ['Gesäß'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Schritt nach hinten statt nach vorne. Weniger Kniebelastung.', sets_recommended: '3–4', reps_recommended: '10–15 pro Bein' },
  { id: 'l017', name: 'Lateral Lunge', muscle: 'Beine', secondary: ['Gesäß'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Seitlicher Ausfallschritt. Innenseite der Oberschenkel.', sets_recommended: '3', reps_recommended: '10–15 pro Seite' },
  { id: 'l018', name: 'Glute Ham Raise (GHR)', muscle: 'Beine', secondary: ['Gesäß'], equipment: 'Maschine', difficulty: 'Profi', instructions: 'Auf dem GHR-Gerät, Beine beugen ohne Hüftbeugung. Sehr intensiv für Hamstrings.', sets_recommended: '3–5', reps_recommended: '5–12' },
  { id: 'l019', name: 'Nordic Curl', muscle: 'Beine', equipment: 'Körpergewicht', difficulty: 'Profi', instructions: 'Knie auf dem Boden, Füße fixiert. Körper langsam nach vorne fallen lassen. Extrem für Hamstrings.', sets_recommended: '3', reps_recommended: '3–8' },
  { id: 'l020', name: 'Box Squat', muscle: 'Beine', secondary: ['Gesäß'], equipment: 'Langhantel', difficulty: 'Fortgeschritten', instructions: 'Auf eine Box setzen und explosiv aufstehen. Hüfte trainieren.', sets_recommended: '3–5', reps_recommended: '5–8' },

  // ── MEHR CORE ─────────────────────────────────────────────────────────────
  { id: 'c016', name: 'L-Sit', muscle: 'Core', secondary: ['Trizeps'], equipment: 'Körpergewicht', difficulty: 'Profi', instructions: 'Auf Parallettes oder Stäben den Körper in L-Form halten. Extreme Core-Stärke.', sets_recommended: '3–5', reps_recommended: '10–30 Sek' },
  { id: 'c017', name: 'V-Up', muscle: 'Core', equipment: 'Körpergewicht', difficulty: 'Fortgeschritten', instructions: 'Arme und Beine gleichzeitig nach oben heben und zusammenführen.', sets_recommended: '3', reps_recommended: '15–20' },
  { id: 'c018', name: 'Woodchop', muscle: 'Core', secondary: ['Schultern'], equipment: 'Kabelzug', difficulty: 'Anfänger', instructions: 'Rotationsbewegung mit dem Kabelzug. Diagonal von oben nach unten oder umgekehrt.', sets_recommended: '3', reps_recommended: '12–15 pro Seite' },
  { id: 'c019', name: 'Bear Crawl', muscle: 'Core', secondary: ['Ganzkörper'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Im Vierfüßlerstand kriechen, Knie knapp über dem Boden. Funktional und Core.', sets_recommended: '3', reps_recommended: '20–30 Meter' },
  { id: 'c020', name: 'Copenhagen Plank', muscle: 'Core', secondary: ['Beine'], equipment: 'Körpergewicht', difficulty: 'Profi', instructions: 'Seitlicher Plank, oberes Bein auf einer Bank. Extreme Seite des Core und Adduktoren.', sets_recommended: '3', reps_recommended: '20–40 Sek pro Seite' },

  // ── KETTLEBELL SPECIAL ────────────────────────────────────────────────────
  { id: 'kb001', name: 'Kettlebell Clean', muscle: 'Ganzkörper', secondary: ['Rücken', 'Beine'], equipment: 'Kettlebell', difficulty: 'Fortgeschritten', instructions: 'Kettlebell vom Boden in die Rack-Position heben. Technisch anspruchsvoll.', sets_recommended: '3–5', reps_recommended: '5–8 pro Seite' },
  { id: 'kb002', name: 'Kettlebell Snatch', muscle: 'Ganzkörper', secondary: ['Schultern'], equipment: 'Kettlebell', difficulty: 'Profi', instructions: 'Kettlebell in einer Bewegung über den Kopf reißen. Olimpisches Heben.', sets_recommended: '3–5', reps_recommended: '5–8 pro Seite' },
  { id: 'kb003', name: 'Turkish Get-Up', muscle: 'Ganzkörper', secondary: ['Core', 'Schultern'], equipment: 'Kettlebell', difficulty: 'Profi', instructions: 'Vom Liegen zum Stehen mit einer Kettlebell über dem Kopf. Komplex und funktional.', sets_recommended: '3', reps_recommended: '3–5 pro Seite' },
  { id: 'kb004', name: 'Kettlebell Press', muscle: 'Schultern', secondary: ['Core'], equipment: 'Kettlebell', difficulty: 'Anfänger', instructions: 'Einarmiges Schulterdrücken mit Kettlebell. Mehr Stabilisation als Kurzhantel.', sets_recommended: '3–4', reps_recommended: '8–15 pro Seite' },
  { id: 'kb005', name: 'Kettlebell Row', muscle: 'Rücken', secondary: ['Bizeps'], equipment: 'Kettlebell', difficulty: 'Anfänger', instructions: 'Einarmiges Rudern mit Kettlebell. Wie einarmiges KH-Rudern.', sets_recommended: '3–4', reps_recommended: '10–15 pro Seite' },

  // ── BAND ÜBUNGEN ──────────────────────────────────────────────────────────
  { id: 'band001', name: 'Band Pull Apart', muscle: 'Schultern', secondary: ['Rücken'], equipment: 'Widerstandsband', difficulty: 'Anfänger', instructions: 'Band auf Schulterhöhe, auseinanderziehen. Hintere Schulter und Schulterblatt.', sets_recommended: '3–4', reps_recommended: '15–25' },
  { id: 'band002', name: 'Band Squat', muscle: 'Beine', secondary: ['Gesäß'], equipment: 'Widerstandsband', difficulty: 'Anfänger', instructions: 'Band unter den Füßen, Kniebeuge mit Widerstand.', sets_recommended: '3–4', reps_recommended: '15–25' },
  { id: 'band003', name: 'Band Curl', muscle: 'Bizeps', equipment: 'Widerstandsband', difficulty: 'Anfänger', instructions: 'Band unter den Füßen stehend. Wie normaler Curl.', sets_recommended: '3', reps_recommended: '15–20' },
  { id: 'band004', name: 'Band Pushdown', muscle: 'Trizeps', equipment: 'Widerstandsband', difficulty: 'Anfänger', instructions: 'Band über einer Tür. Wie Kabel-Pushdown.', sets_recommended: '3', reps_recommended: '15–25' },
  { id: 'band005', name: 'Band Facepull', muscle: 'Schultern', secondary: ['Rücken'], equipment: 'Widerstandsband', difficulty: 'Anfänger', instructions: 'Band auf Kopfhöhe befestigen. Wie Kabel-Facepull.', sets_recommended: '3', reps_recommended: '15–20' },
  { id: 'band006', name: 'Monster Walk', muscle: 'Gesäß', secondary: ['Beine'], equipment: 'Widerstandsband', difficulty: 'Anfänger', instructions: 'Band um die Knie oder Knöchel, seitliche Schritte machen. Gesäß und Abduktoren.', sets_recommended: '3', reps_recommended: '15–20 pro Richtung' },

  // ── MEHR GANZKÖRPER ───────────────────────────────────────────────────────
  { id: 'gk008', name: 'Man Maker', muscle: 'Ganzkörper', equipment: 'Kurzhantel', difficulty: 'Profi', instructions: 'Liegestütz, einarmiges Rudern rechts, einarmiges Rudern links, in die Kniebeuge, Schulterdrücken. Eine Wiederholung.', sets_recommended: '3–5', reps_recommended: '5–10' },
  { id: 'gk009', name: 'Devil Press', muscle: 'Ganzkörper', equipment: 'Kurzhantel', difficulty: 'Profi', instructions: 'Burpee mit Kurzhanteln, dann beide Hanteln über den Kopf.', sets_recommended: '3', reps_recommended: '10–15' },
  { id: 'gk010', name: 'Sandbag Carry', muscle: 'Ganzkörper', secondary: ['Core'], equipment: 'Körpergewicht', difficulty: 'Anfänger', instructions: 'Sandsack tragen – Umarmungsposition oder auf der Schulter. Funktional.', sets_recommended: '3–5', reps_recommended: '30–60 Meter' },
]

// Helper: get all muscle groups
export const ALL_MUSCLES = [...new Set(EXERCISES.map(e => e.muscle))].sort() as MuscleGroup[]

// Helper: get all equipment types
export const ALL_EQUIPMENT = [...new Set(EXERCISES.map(e => e.equipment))].sort() as Equipment[]

// Helper: filter exercises
export function filterExercises(opts: {
  search?: string
  muscle?: MuscleGroup | 'Alle'
  equipment?: Equipment | 'Alle'
  difficulty?: string
}) {
  return EXERCISES.filter(ex => {
    if (opts.search) {
      const q = opts.search.toLowerCase()
      if (!ex.name.toLowerCase().includes(q) &&
          !ex.muscle.toLowerCase().includes(q) &&
          !ex.equipment.toLowerCase().includes(q)) return false
    }
    if (opts.muscle && opts.muscle !== 'Alle' && ex.muscle !== opts.muscle) return false
    if (opts.equipment && opts.equipment !== 'Alle' && ex.equipment !== opts.equipment) return false
    if (opts.difficulty && opts.difficulty !== 'Alle' && ex.difficulty !== opts.difficulty) return false
    return true
  })
}
