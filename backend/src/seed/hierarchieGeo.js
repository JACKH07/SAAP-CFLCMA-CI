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
];
