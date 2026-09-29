import { register } from "../../shared/hub";
import { migrerVersPerruches } from "./store/migration";
import { OptiElevageTool } from "./ui/OptiElevageTool";
import "./styles.css";

// Recupere les donnees d'avant le multi-espece (stockees sans suffixe), avant
// que le moindre composant ne lise son stockage.
migrerVersPerruches();

register("opti-elevage", { Tool: OptiElevageTool });
