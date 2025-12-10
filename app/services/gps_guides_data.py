"""
Base de connaissance "Expert GPS Moto" pour le Roadbook.
Formatage HTML Premium avec Illustrations (FontAwesome) et Call-to-actions.
Généré par Gemini 3 Pro pour une qualité "Platinum Standard".
"""

GPS_GUIDES = {
    "calimoto": {
        "title": "Guide Expert Calimoto (Gemini 3)",
        "icon": "fas fa-motorcycle",
        "content": """
<div class="space-y-6 font-sans text-gray-800">

    <!-- Header & Welcome -->
    <div class="bg-gradient-to-r from-red-600 to-red-800 p-6 rounded-lg shadow-md text-white">
        <h2 class="text-2xl font-bold mb-2"> <i class="fas fa-biking mr-2"></i> Bienvenue sur Calimoto !</h2>
        <p class="text-red-100">
            Calimoto est génial pour les virages, mais il a tendance à vouloir "améliorer" nos trajets. Voici comment le forcer à respecter à 100% l'itinéraire <strong>OldiBike</strong>.
        </p>
    </div>

    <!-- Concept Clé : Trace vs Route -->
    <div class="bg-blue-900/10 border-l-4 border-blue-600 p-4 rounded">
        <h3 class="font-bold text-blue-400 text-lg mb-1">
            ⚠️ Concept Critique : Trace vs Route
        </h3>
        <p class="text-sm text-gray-300 leading-relaxed">
            Le fichier GPX OldiBike est une <strong>TRACE</strong> (une ligne fidèle qui suit la route exacte).
            <br><br>
            Calimoto va convertir cette trace en <strong>ROUTE</strong> (un itinéraire calculé). 
            <strong>Attention :</strong> L'algorithme de Calimoto adore modifier le trajet pour ajouter des virages. Vérifiez toujours que le tracé final correspond à votre attente après l'import.
        </p>
    </div>

    <!-- Guide d'Importation -->
    <div class="bg-gray-800 rounded-lg border border-gray-700 shadow-sm">
        <div class="bg-gray-900 px-4 py-2 border-b border-gray-700 font-semibold text-gray-300">
            Procédure d'importation (Android & iOS)
        </div>
        <div class="p-4">
            <ol class="list-decimal list-inside space-y-3 text-gray-300">
                <li>
                    <strong>Téléchargez le fichier GPX</strong> depuis le site OldiBike directement sur votre smartphone.
                </li>
                <li>
                    Ouvrez l'application <strong>Calimoto</strong>.
                </li>
                <li>
                    Allez dans l'onglet <strong>"Balades"</strong> (ou "Trips") > <strong>"Planifiées"</strong>.
                </li>
                <li>
                    Appuyez sur le bouton <strong>"Importer GPX"</strong> et sélectionnez le fichier téléchargé.
                </li>
                <li>
                    <span class="bg-yellow-900 text-yellow-100 px-2 py-0.5 rounded text-sm font-bold">Important</span> : Calimoto va vous demander de "Calculer l'itinéraire". Acceptez, mais <strong>comparez visuellement</strong> le résultat avec la carte originale si possible.
                </li>
            </ol>
        </div>
    </div>

    <!-- Gestion du Recalcul -->
    <div class="bg-red-900/20 border border-red-500 rounded p-4">
        <h4 class="font-bold text-red-500 flex items-center gap-2">
            <i class="fas fa-exclamation-triangle"></i> Danger : Le Recalcul Automatique
        </h4>
        <p class="text-sm text-red-300 mt-1">
            Calimoto recalculera automatiquement l'itinéraire si vous vous trompez de route. Parfois, il peut vous faire prendre un raccourci qui évite une belle section OldiBike.
        </p>
    </div>

    <!-- Retour sur Trace -->
    <div class="bg-green-900/20 border-l-4 border-green-500 p-4 rounded">
        <h3 class="font-bold text-green-400 text-lg mb-2">
            🔄 Comment rejoindre la trace (Cas de travaux / Erreur)
        </h3>
        <div class="space-y-2 text-gray-300 text-sm">
            <p>
                Si vous devez quitter l'itinéraire (déviation) ou si vous le manquez :
            </p>
            <ul class="list-disc list-inside ml-2 font-medium">
                <li>Ne suivez pas aveuglément les instructions vocales ("Faites demi-tour").</li>
                <li><strong>La Règle d'Or (Visuelle) :</strong> Dézoomez légèrement la carte sur votre écran. Repérez la ligne colorée de l'itinéraire OldiBike.</li>
                <li>Rejoignez cette ligne <strong>"à l'œil"</strong> en prenant les rues qui s'en rapprochent.</li>
            </ul>
            <p class="mt-2 italic text-green-300">
                Une fois de retour sur la ligne colorée, Calimoto reprendra le guidage normalement.
            </p>
        </div>
    </div>

    <div class="text-center text-gray-500 text-sm mt-4">
        OldiBike - L'aventure commence au bout de la rue.
    </div>
</div>
        """
    },
    
    "liberty": {
        "title": "Guide Expert Liberty Rider (Gemini 3)",
        "icon": "fas fa-mobile-alt",
        "content": """
<div class="space-y-6 font-sans text-gray-200">

  <!-- Header Section -->
  <div class="bg-blue-900/40 p-5 rounded-lg border-l-4 border-blue-500 shadow-sm">
    <h2 class="text-xl font-bold text-blue-300 mb-2">✌️ Bienvenue motard !</h2>
    <p class="text-sm text-blue-200">
      Excellent choix d'application pour la sécurité. <strong>Liberty Rider</strong> gère très bien l'importation GPX, mais pour profiter pleinement de l'expérience <strong>OldiBike</strong>, il faut comprendre comment l'application interprète nos fichiers.
    </p>
  </div>

  <!-- Critical Concept: Track vs Route -->
  <div class="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-5 shadow-sm">
    <div class="flex items-start">
      <div class="flex-shrink-0">
        <i class="fas fa-exclamation-triangle text-yellow-500 text-2xl"></i>
      </div>
      <div class="ml-4">
        <h3 class="text-lg font-bold text-yellow-400">⚠️ Concept Vital : La Trace vs Le Recalcul</h3>
        <p class="text-sm text-yellow-200 mt-2">
          Le fichier OldiBike contient une <strong>TRACE</strong> (une ligne géographique fidèle et figée).<br>
          Liberty Rider va transformer cette trace en un <strong>ITINÉRAIRE</strong> navigable (guidage GPS).
        </p>
        <p class="text-sm font-semibold text-yellow-200/80 mt-2">
          L'application va "coller" notre tracé sur les routes qu'elle connaît. Généralement très précis, mais soyez conscient qu'elle recalcule la route entre les points.
        </p>
      </div>
    </div>
  </div>

  <!-- Step-by-Step Guide -->
  <div class="bg-gray-800 border border-gray-700 rounded-lg shadow-sm overflow-hidden">
    <div class="bg-gray-900 px-5 py-3 border-b border-gray-700">
      <h3 class="font-bold text-white"><i class="fas fa-file-import mr-2"></i>Procédure d'Importation</h3>
    </div>
    <div class="p-5">
      <ol class="list-decimal list-inside space-y-4 text-sm text-gray-300">
        <li>
          <strong>Téléchargement :</strong> Récupérez le fichier <code class="bg-black px-1 py-0.5 rounded text-red-400">.gpx</code> OldiBike sur votre smartphone.
        </li>
        <li>
          <strong>Ouverture directe (Recommandé) :</strong> Allez dans vos "Fichiers" ou "Téléchargements", tapez sur le fichier GPX et choisissez <em>"Ouvrir avec Liberty Rider"</em>.
        </li>
        <li>
          <strong>Méthode Alternative :</strong> Ouvrez l'appli Liberty Rider -> Allez dans l'onglet <strong>"Trajets"</strong> -> Appuyez sur <strong>"Importer un GPX"</strong>.
        </li>
        <li>
          <strong>Validation :</strong> L'application va afficher le tracé. Vérifiez qu'il ressemble à la carte OldiBike et validez.
        </li>
      </ol>
    </div>
  </div>

  <!-- Strategy: Back on Track -->
  <div class="bg-indigo-900/30 border border-indigo-500/50 rounded-lg p-5">
    <h3 class="text-lg font-bold text-indigo-300 mb-3">
      <i class="fas fa-compass mr-2 text-indigo-400"></i>Retour sur Trace : La Règle d'Or
    </h3>
    <p class="text-sm text-indigo-200 mb-4">
      Si vous manquez une intersection ou trouvez une route barrée, Liberty Rider va tenter de <strong>recalculer</strong> l'itinéraire le plus rapide pour rejoindre la suite. <strong>C'est le piège !</strong> Il risque de vous faire prendre une nationale inintéressante.
    </p>
    
    <div class="bg-gray-800 p-4 rounded border-l-4 border-indigo-500 shadow-sm">
      <h4 class="font-bold text-indigo-400 text-sm uppercase mb-1">La solution Expert OldiBike :</h4>
      <p class="text-gray-300 text-sm">
        Ignorez les instructions vocales de demi-tour immédiat si elles sont illogiques. <strong>Regardez la carte et rejoignez la ligne colorée À L'ŒIL (visuellement).</strong><br>
        Ne faites confiance au guidage que lorsque votre flèche est physiquement revenue sur le tracé bleu. C'est le seul moyen de garantir la beauté du paysage.
      </p>
    </div>
  </div>

</div>
        """
    },

    "garmin": {
        "title": "Guide Expert Garmin Zumo XT (Gemini 3)",
        "icon": "fas fa-satellite",
        "content": """
<div class="space-y-6 font-sans text-gray-200">

    <!-- Header -->
    <div class="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg border border-gray-700 shadow relative overflow-hidden">
        <div class="p-3 bg-blue-600 rounded-full text-white">
            <i class="fas fa-satellite-dish text-2xl"></i>
        </div>
        <div>
            <h2 class="text-xl font-bold text-white">Le Roi des GPS Moto</h2>
            <p class="text-sm text-gray-400">
                Le Zumo XT est une machine puissante, mais il faut le dompter pour qu'il suive nos petites routes sans broncher.
            </p>
        </div>
    </div>

    <!-- Etape 1 : Le Réglage Vital -->
    <div class="bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
        <h3 class="font-bold text-red-500 text-lg flex items-center">
            <i class="fas fa-sliders-h mr-2"></i> Étape 0 : Paramétrage OBLIGATOIRE
        </h3>
        <p class="text-sm text-gray-300 mt-2 mb-3">
            Avant même d'importer quoi que ce soit, vérifiez ces réglages. Sinon, le Garmin va "casser" l'itinéraire.
        </p>
        <ul class="list-disc list-inside text-sm text-gray-300 font-mono bg-black/30 p-3 rounded">
            <li>Paramètres > Navigation > Recalcul hors route : <span class="text-red-400 font-bold">DÉSACTIVÉ</span> (ou "Sur demande")</li>
            <li>Paramètres > Navigation > Contournements : <span class="text-green-400 font-bold">TOUT DÉCOCHER</span> (Ne pas contourner les petites routes !)</li>
        </ul>
    </div>

    <!-- Etape 2 : Importation moderne -->
    <div class="bg-gray-800 rounded-lg p-5 border border-gray-700">
        <h3 class="font-bold text-white mb-4 flex items-center">
            <i class="fas fa-wifi text-blue-400 mr-2"></i> Importation Sans Fil (Garmin Explore)
        </h3>
        <ol class="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>Sur votre téléphone, installez l'app <strong>Garmin Explore</strong>.</li>
            <li>Téléchargez le fichier GPX OldiBike sur votre téléphone.</li>
            <li>Ouvrez le fichier GPX avec l'app <strong>Explore</strong>.</li>
            <li>Il apparaît dans une "Collection". Synchronisez votre Zumo XT (Bluetooth).</li>
            <li>Sur le GPS : Allez dans "Applis" > "Planificateur de trajets" > "Importation" si nécessaire.</li>
        </ol>
        
        <div class="mt-4 pt-4 border-t border-gray-700">
             <h4 class="font-bold text-gray-400 text-sm mb-2 flex items-center">
                <i class="fas fa-usb mr-2"></i> Méthode Classique (Câble)
            </h4>
            <p class="text-xs text-gray-500">
                Branchez le GPS au PC. Copiez le GPX dans le dossier <code>Internal Storage/GPX</code>. Redémarrez.
            </p>
        </div>
    </div>

    <!-- Etape 3 : Trace vs Route (Vital) -->
    <div class="bg-indigo-900/20 border border-indigo-500 rounded-lg p-5">
        <h3 class="font-bold text-indigo-300 text-lg mb-2">
           🧐 Trace (Track) ou Itinéraire (Trip) ?
        </h3>
        <p class="text-sm text-indigo-200 mb-4">
            Le fichier GPX contient souvent les deux.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div class="bg-black/20 p-3 rounded border border-gray-600">
                <span class="block font-bold text-purple-400 mb-1">LA TRACE (Recommandé)</span>
                <p class="text-xs text-gray-400">
                    C'est un simple trait sur la carte. Ne parle pas. Ne recalcule jamais. C'est du 100% fidèle.
                    <br><strong>Astuce Pro :</strong> Affichez-la en permanence sur la carte (Couleur Cyan) comme "fond de carte".
                </p>
             </div>
             <div class="bg-black/20 p-3 rounded border border-gray-600">
                <span class="block font-bold text-blue-400 mb-1">L'ITINÉRAIRE (Confort)</span>
                <p class="text-xs text-gray-400">
                    C'est du guidage "Tournez à droite". Confortable, mais le Garmin peut décider de changer la route si vous loupez un virage.
                </p>
             </div>
        </div>
    </div>

    <!-- Retour sur Trace -->
    <div class="bg-green-900/20 border-l-4 border-green-500 p-4 rounded mt-4">
        <h3 class="font-bold text-green-400 text-lg mb-2">
            🔄 Vous avez quitté la route ?
        </h3>
        <p class="text-sm text-gray-300 mb-2">
            <strong>Ne paniquez pas lors d'une déviation.</strong>
        </p>
        <ul class="space-y-2 text-sm text-gray-300">
            <li>
                <span class="font-bold text-green-300">Méthode "Saut de Point" :</span> Si vous êtes en mode "Itinéraire" et qu'il veut vous faire faire demi-tour, appuyez sur le menu (3 points) > <strong>"Sauter le prochain point"</strong> (Skip Waypoint) jusqu'à ce qu'il vise devant vous.
            </li>
            <li>
                <span class="font-bold text-green-300">Méthode Visuelle (Top) :</span> Si vous avez affiché la TRACE en fond de carte (voir étape 3), naviguez simplement à vue pour retrouver le trait Cyan. C'est infaillible.
            </li>
        </ul>
    </div>

</div>
        """
    },

    "tomtom": {
        "title": "Guide Expert TomTom Rider",
        "icon": "fas fa-map-marked",
        "content": """
            <div class="space-y-6 text-left font-light">
                <div class="border-b border-gray-700 pb-4 mb-4">
                    <h3 class="text-2xl font-heading text-accent mb-2">TomTom & MyDrive</h3>
                    <p class="text-gray-300">Les TomTom Rider modernes (400, 500, 550) sont excellents pour synchroniser sans fil. Mais attention au format de fichier !</p>
                </div>

                <div class="bg-red-900/20 border border-red-500/50 rounded-xl p-6 mb-6">
                    <h4 class="text-red-500 font-bold mb-2 flex items-center"><i class="fas fa-ban mr-2"></i> ITN vs GPX</h4>
                    <p class="text-sm text-gray-300">
                        N'utilisez <strong>JAMAIS</strong> de fichiers .ITN (Roadbook points). Ils forcent le GPS à calculer sa propre route entre les points.<br>
                        Utilisez toujours le format <strong>.GPX (Track/Trace)</strong> que nous fournissons. C'est une ligne continue indélébile.
                    </p>
                </div>

                <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700 relative overflow-hidden">
                    <span class="absolute top-0 right-0 p-4 text-6xl text-gray-700/20 font-heading font-bold">1</span>
                    <h4 class="text-xl font-bold text-white mb-3">Synchronisation Cloud</h4>
                    <ol class="list-decimal pl-5 space-y-3 text-sm text-gray-300">
                        <li>Allez sur le site <strong>mydrive.tomtom.com</strong> sur votre ordinateur ou smartphone.</li>
                        <li>Connectez-vous avec le même compte que votre GPS.</li>
                        <li>Allez dans le menu "Mes Parcours" > Cliquez sur <strong>"Importer un fichier GPX"</strong>.</li>
                        <li>Sélectionnez le fichier OldiBike.</li>
                    </ol>
                </div>

                <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700 relative overflow-hidden">
                    <span class="absolute top-0 right-0 p-4 text-6xl text-gray-700/20 font-heading font-bold">2</span>
                    <h4 class="text-xl font-bold text-white mb-3">Sur le GPS</h4>
                    <p class="text-sm text-gray-400 mb-3">Assurez-vous que votre Rider est connecté au Wi-Fi ou au Bluetooth de votre téléphone.</p>
                    <ul class="space-y-2 text-sm text-gray-300">
                        <li>Allez dans "Mes Parcours".</li>
                        <li>Le nouveau voyage devrait apparaître (sinon forcez la synchro).</li>
                        <li>Cliquez dessus, puis <strong>"Rouler"</strong>.</li>
                    </ul>
                </div>

                <!-- RECOVERY -->
                <div class="mt-8 pt-6 border-t border-gray-700">
                    <h4 class="text-lg font-heading text-white mb-3">🔄 Retour sur Trace</h4>
                    <div class="bg-blue-900/20 p-4 rounded border-l-4 border-blue-500">
                         <p class="text-sm text-gray-300">
                            <strong>TomTom est intelligent :</strong> Si vous quittez la trace, il essayera de vous y ramener le plus vite possible. <br>
                            Si une route est barrée, contournez-la simplement à vue. Dès que vous rejoignez le trait bleu plus loin, TomTom reprendra le guidage automatiquement sans intervention.
                         </p>
                    </div>
                </div>
            </div>
        """
    },

    "osmand": {
        "title": "Guide OsmAnd (Expert)",
        "icon": "fas fa-globe-americas",
        "content": """
            <div class="space-y-4 text-left">
                <p class="text-sm text-gray-400">OsmAnd est l'outil le plus puissant pour l'aventure, capable de fonctionner totalement hors-ligne.</p>
                
                <div class="steps space-y-6">
                    <div class="step relative pl-6 border-l border-gray-700">
                        <div class="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-accent"></div>
                        <h5 class="font-bold text-white">1. Ouvrir le GPX</h5>
                        <p class="text-sm text-gray-400">Téléchargez le GPX. Cliquez dessus et choisissez "Ouvrir avec OsmAnd".</p>
                    </div>

                    <div class="step relative pl-6 border-l border-gray-700">
                        <div class="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-accent"></div>
                        <h5 class="font-bold text-white">2. Configurer la Trace</h5>
                        <p class="text-sm text-gray-400">OsmAnd va afficher le menu "Tracé". Activez l'option <strong>"Afficher sur la carte"</strong>.<br>
                        Vous pouvez aussi utiliser "Navigation" > "Joindre la trace", mais suivre simplement la ligne visuellement est souvent plus fiable en offroad/aventure.</p>
                    </div>
                </div>
                
                 <!-- RECOVERY -->
                <div class="mt-8 pt-6 border-t border-gray-700">
                    <h4 class="text-lg font-heading text-white mb-3">🔄 Déviation ?</h4>
                    <div class="bg-blue-900/20 p-4 rounded border-l-4 border-blue-500">
                         <p class="text-sm text-gray-300">
                            En mode aventure, fiez-vous à vos yeux. Si un chemin est bloqué, utilisez la carte pour trouver un contournement et <strong>rejoignez la ligne colorée</strong> plus loin. Ne lancez pas de recalcul inutile.
                         </p>
                    </div>
                </div>
            </div>
        """
    }
}
