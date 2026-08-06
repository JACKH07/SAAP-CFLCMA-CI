/**
 * Hiérarchie géographique CFLCMA-CI
 * région → districts → paroisses
 * (sans surintendants)
 */
module.exports = [
  {
    region: 'Abidjan 1',
    code: 'ABJ1',
    districts: [
      {
        district: 'Cocody',
        paroisses: [
          'Assistant de Région',
          'Bingerveille',
          'Gbagba',
          'Alepé',
          'II Plateaux',
          'Riviéra Triangle',
          'Akouédo',
          "M'Pouto",
          'Aboisso Comoé',
        ],
      },
      {
        district: 'Abobo 1',
        paroisses: [
          'Williams ville',
          'Kennedy',
          'Assistant Dokui 1',
          'Dokui 2',
          'Dokui 1',
          'Sagbé',
        ],
      },
      {
        district: 'Abobo 2',
        paroisses: [
          'Avocatier',
          'PK 18',
          'Abobo PK 18',
          'Anyama',
          'Plaque',
          'Akéikoi',
        ],
      },
      {
        district: 'Adzopé',
        paroisses: ['Adzopé', 'Akoupé', 'Yakassé-Attobrou', 'Yakassé Mé'],
      },
      {
        district: 'Abengourou',
        paroisses: [
          'Niablé',
          'Zaranou',
          'Abengourou',
          'Agnibilékro',
          'Yakassé Feyassé',
          'Damé',
          'Aniassué',
          'Tienkouakro',
          'Béttié',
          'Yobouakro',
          'Amélékia',
          'Pengakro',
          'Akoboissué',
          'Duffrébo',
        ],
      },
    ],
  },
  {
    region: 'Abidjan 2',
    code: 'ABJ2',
    districts: [
      {
        district: 'Sideci',
        paroisses: ['SIDECI', 'Assistant', 'Andokoi', 'Lagare', 'Azito'],
      },
      {
        district: 'Niangon',
        paroisses: ['Maroc', 'Niangon', 'Songon', 'Assistante Dist'],
      },
      {
        district: 'Port Bouet 2',
        paroisses: ['Petit Bouaké', 'GESCO Ciel', 'Assistant', 'Port-Bouët 2'],
      },
      {
        district: 'Camp Militaire',
        paroisses: ['Camp Militaire'],
      },
      {
        district: 'Cité Fairmon',
        paroisses: ['Cité Fairmon', 'Jérusalem', 'Djéné-Ecarré'],
      },
    ],
  },
  {
    region: 'Abidjan 3',
    code: 'ABJ3',
    districts: [
      {
        district: 'Koumassi 1',
        paroisses: ['Koumassi 1', 'Bassam', 'Bonoua'],
      },
      {
        district: 'Koumassi 2',
        paroisses: ['Koumassi 2', 'Trechville'],
      },
      {
        district: 'Port-Bouet',
        paroisses: ['Port-Bouët', 'IRHO', 'Gonzagueville', 'Adjahui'],
      },
      {
        district: 'Aboisso',
        paroisses: ['Tiapoum', 'Adiaké', 'Aboisso', 'Ehania'],
      },
    ],
  },
  {
    region: 'Agboville',
    code: 'AGB',
    districts: [
      {
        district: 'Agboville',
        paroisses: ['Agboville', 'Adahou'],
      },
      {
        district: 'Aboudé Mandeké',
        paroisses: ['Aboudé Mandeké', 'Attiguei', 'Offoumpo'],
      },
      {
        district: 'Rubino',
        paroisses: ['Rubino', 'Céchi', 'Aké-douanier'],
      },
      {
        district: 'Tiassalé',
        paroisses: ['Bacanda', 'Dibykro', 'Broukro', 'Tiassalé'],
      },
      {
        district: 'Morokro',
        paroisses: ['Affikro', 'Amanikro', 'Morokro'],
      },
      {
        district: "N'Douci",
        paroisses: ["N'douci", 'Bodo'],
      },
      {
        district: "N'Zianouan",
        paroisses: ['Kpacobo', 'Singrobo', "N'zianouan"],
      },
      {
        district: 'Sikensi',
        paroisses: ['Sikensi', 'Elibou', "M'Brou", 'Bécédi'],
      },
    ],
  },
  {
    region: 'Béoumi',
    code: 'BEO',
    districts: [
      {
        district: 'Béoumi',
        paroisses: [
          'Béoumi',
          'Latobo',
          'Fitabro',
          'Ando Kekrenou',
          'Kondrobo',
          'Niambrun',
          'Kounahiri',
          'Totokro',
          'Kongasso',
          'Golikro',
          'Soukourougban',
          'Tiéningboué',
        ],
      },
      {
        district: 'Sakassou',
        paroisses: [
          'Sakassou',
          'Sakassou Nord',
          'Sakassou sud',
          'Sakassou sud 2',
          'Asrikro 1',
          'Asrikro 2',
          'Toumodi Sakassou',
        ],
      },
      {
        district: 'Bodokro',
        paroisses: [
          "N'guessankro",
          'Ahounzè',
          "N'zuénouan",
          'Bodokro',
          'Allokokro',
          'Goly Lolobo',
        ],
      },
    ],
  },
  {
    region: 'Bocanda',
    code: 'BOC',
    districts: [
      {
        district: 'Bocanda',
        paroisses: [
          'Gbonou',
          'Fondi 2',
          'Souamékro',
          'Katchiré Essekro',
          'Bocanda 1',
          'Daouakro',
          'Djakpo Konandrikro',
        ],
      },
      {
        district: 'Bengassou',
        paroisses: ['Bengassou', 'Dida Kayabo', 'Assika Kayabo'],
      },
      {
        district: 'Kouadioblekro',
        paroisses: [
          'Kouadioblékro',
          'Guimbo bayassou',
          'Attanou',
          "N'zecrezessou 1",
          "N'zecrezessou 2",
        ],
      },
      {
        district: 'Kouassi-Kouassikro',
        paroisses: ['Bonzomalékro', 'Kouassi Kouassikro', 'Bounda'],
      },
    ],
  },
  {
    region: 'Bouaflé',
    code: 'BFL',
    districts: [
      {
        district: 'Bouaflé',
        paroisses: [
          'Zougoussou',
          'Bouaflé 2',
          'Petit Kononfla',
          'Pakouabo',
          'Bouaflé 1',
        ],
      },
      {
        district: 'Bonon',
        paroisses: ['Bonon', "N'doli yaokro", 'Gbangbokouamékro', 'Djahakro'],
      },
      {
        district: 'Zuénoula',
        paroisses: ['Sucrivoire', 'Kanzra', 'Zuénoula'],
      },
      {
        district: 'Yowlè-Bozi',
        paroisses: ['Plate-forme', 'Yowlè-Bozi', 'Angovia'],
      },
    ],
  },
  {
    region: 'Bouaké 1',
    code: 'BK1',
    districts: [
      {
        district: 'Djébonoua',
        paroisses: ['Sessekro', 'Djébonoua', 'Konzo', 'Assouakro'],
      },
      {
        district: 'Koko',
        paroisses: [
          'Koko',
          'Yaokoffikro',
          'Kouakoublekro',
          'Languibonou',
          'Boniérédougou',
          'Kouakro',
          'Katiola',
          'Tikakro',
        ],
      },
      {
        district: 'Broukro',
        paroisses: ['Broukro', 'Bendè-Kouassikro', "N'zuekro"],
      },
      {
        district: 'Zone',
        paroisses: [
          'Zone',
          'Bamoro',
          'Dares-salam',
          'Allokokro',
          'Konankankro',
        ],
      },
      {
        district: 'Botro',
        paroisses: ['Botro 1', 'Botro 2'],
      },
      {
        district: 'Diabo',
        paroisses: ['Diabo', 'Saoundi', 'Diabo 2'],
      },
    ],
  },
  {
    region: 'Bouaké 2',
    code: 'BK2',
    districts: [
      {
        district: "Tié-n'diékro",
        paroisses: ["Tié-n'diékro", 'Gbangbossou', 'Raviart'],
      },
      {
        district: "M'bahiakro",
        paroisses: [
          "M'bahiakro",
          'Dangou',
          "N'Zanhoukro",
          'Akpoueboué',
          'Wassadougou',
          "M'Bahia Yaokro",
          'Ananda',
        ],
      },
      {
        district: 'Air-France',
        paroisses: [
          'Air-France',
          'Gouazounou',
          "N'Dranouan 1",
          "N'Dranouan 2",
          'Station Sokoura',
        ],
      },
      {
        district: 'Belleville',
        paroisses: ['Belleville', 'Toungbakro', 'Sataman Sokoro', 'Kouakro'],
      },
      {
        district: 'Brobo',
        paroisses: [
          'Brobo',
          'Saminikro',
          'Akpouessou',
          'Sinanvessou',
          'Mamini',
          'Yéguébo',
          'Pindikro',
        ],
      },
    ],
  },
  {
    region: 'Daloa',
    code: 'DAL',
    districts: [
      {
        district: 'Lobia 2',
        paroisses: [
          'Assistant',
          'Tazibouo 2',
          'Lobia 2',
          'Zaïbo',
          'Bonoufla',
          'Sikaboutou',
          'Kennedy 2',
        ],
      },
      {
        district: 'Zoukougbeu',
        paroisses: ['Guessabo', 'Gregbeu', 'Zoukougbeu'],
      },
      {
        district: 'Abattoir 2',
        paroisses: ['Abattoir 2', 'Zépréguhe', 'Gboguhé', 'Koréa'],
      },
      {
        district: 'Belleville',
        paroisses: ['V12 Domangbeu', 'Kpangbassou', 'Belleville'],
      },
      {
        district: 'Gonaté',
        paroisses: [
          'Guypiry',
          'Gonaté',
          'Gadouan',
          "M'bahiakoffikro",
          'Kotokro (Siefla)',
        ],
      },
      {
        district: 'Bédiala',
        paroisses: ['Bédiala', 'Gnamanou', 'Luénoufla', 'Bandiahi'],
      },
      {
        district: 'Séguéla',
        paroisses: ['Séguéla', 'Kani', 'Worofla'],
      },
      {
        district: 'Vavoua',
        paroisses: ['Vavoua', 'Miniore', 'Kétro Bassam'],
      },
      {
        district: 'Dania',
        paroisses: ['Dania', 'Pélézi', 'Monoko Zohi'],
      },
    ],
  },
  {
    region: 'Daoukro',
    code: 'DAO',
    districts: [
      {
        district: 'Gagou',
        paroisses: ['Gagou', "N'gattakro", 'Ekpinikro', 'Ettrokro', 'Broukro'],
      },
      {
        district: 'Daoukro',
        paroisses: ['Agni Assikasso', 'Daoukro', 'Léki Kouadiokro'],
      },
      {
        district: 'Prikro',
        paroisses: ['Prikro', "Gbangbo N'Dakro"],
      },
      {
        district: 'Ouellé',
        paroisses: ['Ouellé', 'Bendié-Koménankro', "N'zanzansou"],
      },
    ],
  },
  {
    region: 'Gabiadji',
    code: 'GBJ',
    districts: [
      {
        district: 'Touih',
        paroisses: ['Touih', 'Kpacobo', 'Goh', 'Marie Chantier', "N'ziyaokro"],
      },
      {
        district: 'Gabiadji',
        paroisses: ['Gabiadji', 'Gnity Ecole', 'Bida', 'Blahou'],
      },
      {
        district: 'Dagadji',
        paroisses: [
          'Dagadji',
          'Assistante District',
          'Nigadji',
          'Gagny',
          'Brahimakro',
        ],
      },
      {
        district: 'Grobonoudan',
        paroisses: ['Nonoua', 'Grobonoudan', 'Boignykro'],
      },
      {
        district: 'Gligbeuadji',
        paroisses: ['Gligbeuadji', 'Doba', 'Jeannotkro'],
      },
    ],
  },
  {
    region: 'Gagnoa',
    code: 'GAG',
    districts: [
      {
        district: 'Guibéroua',
        paroisses: ['Guibéroua 1', 'Guibéroua 2', 'Dignago'],
      },
      {
        district: 'Babré',
        paroisses: [
          'Babré',
          'Assistant',
          'Logobia',
          'Delbo',
          'Doukouyo',
          'Sérhio',
          'Béhibrokro',
        ],
      },
      {
        district: 'Garahio',
        paroisses: [
          'Garahio',
          'Dougou Palegnoa',
          'Mabouo',
          'Gnangbodougnoa',
          'Ahizabrè',
        ],
      },
      {
        district: 'Galèbrè',
        paroisses: [
          'Béthel (Galèbrè 2)',
          'Godo konankro',
          'Krakro',
          'Kakahakro',
          'Galèbrè 1',
        ],
      },
      {
        district: 'Ouragahio',
        paroisses: ['Mama', 'Yopohué', 'Ouragahio'],
      },
      {
        district: 'Yabayo',
        paroisses: ['Yabayo', 'Gnongboyo', 'Gbakayo', 'Obrouayo', 'Guimeyo'],
      },
    ],
  },
  {
    region: 'Dimbokro',
    code: 'DMK',
    districts: [
      {
        district: 'Dimbokro',
        paroisses: [
          'Djangokro 2',
          'Djangokro',
          'Nofou',
          'Nofou 2',
          'Dimbokro centre',
          'Assistante région',
        ],
      },
      {
        district: 'Tiémélékro',
        paroisses: ['Tiémélékro', "N'gohinou", 'Sérébissou'],
      },
      {
        district: 'Comikro',
        paroisses: ['Comikro', 'Konanlekikro', 'Dimbokro cité'],
      },
      {
        district: "M'Batto",
        paroisses: [
          'Bongouanou',
          'Arrah',
          "M'batto",
          'Assiè kournassi',
          'Anoumaba',
          'Andé',
          "N'drikro",
          'Adouakouakro',
          'Anoumaba 2',
          'Kotobi',
          'Anoumaba 3',
        ],
      },
    ],
  },
  {
    region: 'Divo 1',
    code: 'DIV1',
    districts: [
      {
        district: 'Divo 1',
        paroisses: ['Konankro', 'Gremian', 'Assistant', 'Didoko'],
      },
      {
        district: 'Lakota',
        paroisses: [
          'Lakota',
          'Niambézaria',
          'Groguya',
          'Djôkô',
          'Kpadako',
          'Laddè',
          'Krikpokou',
          'Gragba',
        ],
      },
      {
        district: 'Zikisso',
        paroisses: ['Zikisso', 'Djidji', 'Gagoré'],
      },
      {
        district: 'Hiré',
        paroisses: ['Hiré', 'Goudi', 'Bonikro'],
      },
      {
        district: 'Wagana',
        paroisses: ['Wagana', 'Dairo-Didizo', 'Akromankro', 'B.Penda'],
      },
    ],
  },
  {
    region: 'Divo 2',
    code: 'DIV2',
    districts: [
      {
        district: 'Guitry',
        paroisses: [
          'Guitry',
          "N'Drikro",
          'Godè Yaokro',
          'Tiégba',
          'Barthélemykro',
        ],
      },
      {
        district: 'Divo 2',
        paroisses: [
          'Dialogue',
          'Labodougou',
          'Ogoudou',
          'Blé',
          'Nébo',
          'Zéhiri',
          'Palm-Ci',
        ],
      },
      {
        district: 'Kouamékro',
        paroisses: [
          'Kouamékro',
          'Amanikro',
          'Kouadiobakro',
          'Trois carrefours',
          'Assistante District',
          'Iroporia',
        ],
      },
      {
        district: 'Chiepo',
        paroisses: ['Chiepo', 'Paukro', 'CFI', 'Okabo'],
      },
    ],
  },
  {
    region: 'Duékoué',
    code: 'DUE',
    districts: [
      {
        district: 'Duékoué 1',
        paroisses: [
          'Guéhiébly',
          'Duékoué 1',
          'SEBAF 2',
          'Kouadio 1',
          'Pinhou-Duékoué',
          'SEBAF 1',
        ],
      },
      {
        district: 'Duékoué 2',
        paroisses: ['Gbapleu', 'Blody', '4 Carrefours', 'Duékoué 2'],
      },
      {
        district: 'Guézon',
        paroisses: ['Dibobly', 'V14', 'Guézon'],
      },
      {
        district: 'Zou',
        paroisses: ['Pinhou', 'Zou', 'Kahin', 'Bangolo'],
      },
    ],
  },
  {
    region: 'Grand-Lahou',
    code: 'GLH',
    districts: [
      {
        district: 'Grand-Lahou',
        paroisses: ['Dougodou', 'Dokpodon', 'Grand-Lahou', 'Lauzoua'],
      },
      {
        district: 'Fresco',
        paroisses: ['Fresco', 'Okromodou', 'Gbagbam', 'Dahiri'],
      },
      {
        district: 'Dabou',
        paroisses: ['Dabou', 'Ira'],
      },
    ],
  },
  {
    region: 'Sinfra',
    code: 'SIN',
    districts: [
      {
        district: 'Sinfra',
        paroisses: [
          'Delpriyaokro',
          'K/Kouassikro',
          'Huafla',
          'Sinfra',
          'Houphouet Boigny',
        ],
      },
      {
        district: 'Kouétinfla',
        paroisses: ['Kouétinfla', 'Brunokro'],
      },
      {
        district: 'Kononfla',
        paroisses: ['Petit Bouaké', 'Kononfla 2', 'Kononfla 1', 'Bazré'],
      },
      {
        district: 'Bayota',
        paroisses: ['Bayota', 'Téhiri'],
      },
    ],
  },
  {
    region: 'Man',
    code: 'MAN',
    districts: [
      {
        district: 'Man',
        paroisses: [
          'Bounta',
          'Yorodougou',
          'Sémian',
          'Douagué',
          'Man',
          'Biankouma',
        ],
      },
      {
        district: 'Kouibly',
        paroisses: ['Bléniminhouin', 'Poumbly', 'Kouibly', 'Nidrou'],
      },
      {
        district: 'Danané',
        paroisses: [
          'Danané',
          'Kouan-Houlé',
          'Zouan-Hounien',
          'Mahapleu',
          'Sangouiné',
        ],
      },
    ],
  },
  {
    region: 'Sassandra',
    code: 'SAS',
    districts: [
      {
        district: 'Sassandra',
        paroisses: [
          'Medon',
          'Sassandra',
          'Lobaloukouya',
          'Niani Carrefour',
          'Sahoua',
        ],
      },
      {
        district: 'Sago',
        paroisses: [
          'Adébem',
          'Gnago 1',
          'Dakpadou',
          'Niapidou',
          'Madinante',
          'Sago',
        ],
      },
      {
        district: 'Balokuya',
        paroisses: ['Balokuya', 'Petit béoumi', 'SOFOCI'],
      },
    ],
  },
  {
    region: 'Issia',
    code: 'ISS',
    districts: [
      {
        district: 'Issia',
        paroisses: ['Issia 2', 'Issia 1', 'Zéga', 'Boguédia', 'Gazibouo'],
      },
      {
        district: 'Iboguhé',
        paroisses: ['Iboguhé', '4 carrefours', 'Godoguhé'],
      },
      {
        district: 'Saïoua',
        paroisses: ['Kélèmagni', 'Saïoua', 'Nahio', 'Oka kouakoukro'],
      },
    ],
  },
  {
    region: 'Guiglo',
    code: 'GUI',
    districts: [
      {
        district: 'Guiglo',
        paroisses: [
          'Nizahon V16',
          'Banco CHC 3',
          'Guiglo',
          'Kaadé',
          'Goya 1',
          'Gbiapleu',
        ],
      },
      {
        district: 'Bloléquin',
        paroisses: ['Toulepleu', 'CIB', 'Bloléquin', 'Zeaglo'],
      },
      {
        district: 'Zagné',
        paroisses: ['Zagné', 'CHC 1', 'CHC 2'],
      },
      {
        district: 'Taï',
        paroisses: ['Taï', 'Kéibly'],
      },
    ],
  },
  {
    region: 'Oumé',
    code: 'OUM',
    districts: [
      {
        district: 'Oumé',
        paroisses: [
          'Kouaméfla',
          'Oumé',
          'Doukouya',
          'Gnamien kouadiokro',
          'Faitaikro',
        ],
      },
      {
        district: 'Diégonefla',
        paroisses: ['Diégonefla', 'Ouikao', 'Bléa'],
      },
      {
        district: 'Guépahouo',
        paroisses: ['Guépahouo', 'Nagadoukou', "N'Dakro"],
      },
    ],
  },
  {
    region: 'Yamoussoukro 1',
    code: 'YAM1',
    districts: [
      {
        district: "N'zuessy",
        paroisses: [
          'Toumbokro',
          "N'zuessy",
          'Assistant',
          'Sahabo',
          'Zambakro',
          'OPH',
        ],
      },
      {
        district: 'Taabo',
        paroisses: ['Taabo', 'Gbovia', 'Taabo village'],
      },
      {
        district: 'Toumodi',
        paroisses: [
          'Toumodi',
          'Binava',
          'Akovinkro',
          'Kpouébo',
          'Konankokorékro',
          'Moronou',
          'Toumodi 2',
          'Dida-Yakro',
        ],
      },
      {
        district: 'Kokoumbo',
        paroisses: [
          'Djékanou',
          'Abou Akakro 2',
          'Djekanou 2',
          'Kokoumbo',
          'Bonikro',
          'Assènzé',
        ],
      },
      {
        district: 'Sopim',
        paroisses: [
          'Sopim',
          'Kokrénou',
          'Akpessékro',
          'Soubiakro',
          '4ième Terrain',
          'Koukroubo',
        ],
      },
      {
        district: "N'Gangoro",
        paroisses: ['Pranouan', "N'Gangoro", 'Yakpabo Sakassou'],
      },
      {
        district: "N'gokro",
        paroisses: ["N'gokro", 'Lolobo', 'Djahakro'],
      },
      {
        district: 'Morofé',
        paroisses: ['Mahounou', 'Tounzouébo', 'Morofé'],
      },
      {
        district: 'Tiébissou',
        paroisses: [
          'Tiébissou',
          'Molonou',
          "N'gatta-Dolikro",
          'Kondrobo',
          "Akoi n'dènou",
          "Assè-m'bo",
        ],
      },
    ],
  },
  {
    region: 'Yamoussoukro 2',
    code: 'YAM2',
    districts: [
      {
        district: '220 Logements',
        paroisses: ['221 Logements', 'Millionnaire', 'Assistant de Région'],
      },
      {
        district: 'Attiégouakro',
        paroisses: ['Attiégouakro', 'Ouffoué Diékro', 'Morokinkro'],
      },
      {
        district: 'Didiévi',
        paroisses: ['Didiévi', 'Molonoublé', 'Boli', 'Djassanou', 'Assankro'],
      },
      {
        district: 'Lac-Cité',
        paroisses: ['Baba', 'Watté', 'Kandakro', 'Lac-Cité'],
      },
      {
        district: 'Edmond carrefour',
        paroisses: ['Pierrekro', 'Namané', 'Edmond carrefour'],
      },
    ],
  },
  {
    region: 'Soubré 1',
    code: 'SOU1',
    districts: [
      {
        district: 'Soubouo',
        paroisses: ['Soubouo', 'Assistant', 'Bertinkro', 'Dabeuyeroua'],
      },
      {
        district: 'Okrouyo',
        paroisses: [
          'SIPEF-CI',
          'Tollakro',
          'Okrouyo',
          'Otowa',
          'Gbadakouamékro',
          'Zogbodoua',
        ],
      },
      {
        district: 'Dobré',
        paroisses: ['Dobré', 'Oussoukro', '4 carrefours'],
      },
    ],
  },
  {
    region: 'Soubré 2',
    code: 'SOU2',
    districts: [
      {
        district: 'Madou Sahoua',
        paroisses: [
          'Madou Sahoua',
          'Lobogba',
          'Angangui',
          'Amaniyaokro',
          'Blédou Kangakro',
          'Camp-Manois',
          'Gbakalekpa',
        ],
      },
      {
        district: 'Oupoyo',
        paroisses: ['Oupoyo', 'Gnipi 2', 'Amani Kouamé', 'Chantier-Mo'],
      },
      {
        district: 'Grand-Zattry',
        paroisses: [
          'Parc-sous',
          'Grand zatty',
          'Zakeoua',
          'Mahieoua',
          'Kouamejosephkro',
          'Seoua',
          'Konédougou',
        ],
      },
      {
        district: 'Petit Bouaké',
        paroisses: [
          'Sarakagui',
          'Petit Bouaké',
          'Amanikouadjokro',
          'Walèbo',
        ],
      },
      {
        district: 'Méagui',
        paroisses: [
          'Abodankro',
          'Méagui 1',
          'Petit Marché',
          'Touadji',
          'Assawlékro',
          'Pascalkro',
          'Méagui 2',
        ],
      },
      {
        district: 'Guéyo',
        paroisses: [
          'Guéyo',
          'Salifoukro',
          'Jean Baptistekro',
          'Bodouyo',
          'Dabuyo 3',
        ],
      },
      {
        district: 'Buyo',
        paroisses: ['Buyo', 'Adoukouassikro', 'Assamoikro'],
      },
      {
        district: 'V3',
        paroisses: ['V3', 'V4', 'V1', 'V6'],
      },
      {
        district: 'Dapeoua',
        paroisses: ['Dapeoua', "M'mé koffikro", 'Amanikro'],
      },
    ],
  },
];
