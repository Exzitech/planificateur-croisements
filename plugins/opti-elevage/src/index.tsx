import { register } from "../../shared/hub";
import { migrerVersPerruches } from "./store/migration";
import { PlanificateurTool } from "./ui/PlanificateurTool";
import "./styles.css";

// Recupere les donnees d'avant le multi-espece (stockees sans suffixe), avant
// que le moindre composant ne lise son stockage.
migrerVersPerruches();

register("opti-elevage", { Tool: PlanificateurTool });
