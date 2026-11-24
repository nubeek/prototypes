/**
 * MBN Brands, from the WeFranch prospects record for institution pr1kx.
 *
 * Management photos, emails, phones, and LinkedIn profiles come from that
 * record. Jimmy John's store names, street addresses, and phones come from
 * its units table. Each address is paired with the map pin already stored
 * for this owner. Where the units table named the wrong city, the city is
 * the one the street geocodes to.
 *
 * A dash is a contact the record did not include, so the prototype does not
 * invent one. Michael Mulcahy is no longer on the org chart.
 */
(function () {
  const dump = window.cstDumpData;
  const owner = dump?.owners?.find((item) => item.publicId === "pr1kx");
  if (!owner) return;

  function person(key, name, title, email, phone, linkedinUrl) {
    return {
      key,
      name,
      title,
      email: email || "–",
      phone: phone || "–",
      linkedinUrl: linkedinUrl || "",
      children: []
    };
  }

  const kevin = person(
    "kevin-mulcahy",
    "Kevin Mulcahy",
    "Partner",
    "kevin.james.mulcahy@gmail.com",
    "203-526-6885",
    "https://www.linkedin.com/in/kevin-mulcahy-8b678433/"
  );
  kevin.children = [
    person(
      "anne-mulcahy",
      "Anne Mulcahy",
      "Executive Chairman",
      "",
      "",
      "https://www.linkedin.com/in/anne-mulcahy-0943a2247/"
    ),
    person(
      "leo-nolan",
      "Leo Nolan",
      "Partner",
      "",
      "",
      "https://www.linkedin.com/in/leo-nolan-5b747b40/"
    ),
    person(
      "wyattbatchelor",
      "Wyatt Batchelor",
      "Partner",
      "wyattbatchelor@gmail.com",
      "",
      "https://www.linkedin.com/in/wyattbatchelor/"
    )
  ];

  owner.contactsCount = 5;
  owner.contact = {
    name: kevin.name,
    title: kevin.title,
    email: kevin.email,
    phone: kevin.phone,
    linkedinUrl: kevin.linkedinUrl,
    orgKey: kevin.key
  };
  owner.orgChart = [
    kevin,
    person(
      "tripcowin",
      "Trip Cowin",
      "Partner",
      "trip.cowin@gmail.com",
      "203-417-7586",
      "https://www.linkedin.com/in/tripcowin/"
    )
  ];
  owner.unitsCount = 44;
  owner.units = [
      [39.853, -105.082, 245349, "8410 Wadsworth Blvd, Westminster, CO", "Arvada", "(303) 867-3525"],
      [38.235, -104.663, 245350, "4016 W Northern Avenue, Pueblo, CO", "Pueblo", "(719) 225-7196"],
      [35.653, -97.456, 245351, "1900 E 2nd Street, Edmond, OK", "Edmond", "(405) 715-3200"],
      [35.212, -97.444, 245352, "775 Asp Ave, Norman, OK", "Norman", "(405) 701-5337"],
      [39.856, -105.055, 245353, "8725 Sheridan Blvd, Westminster, CO", "Westminster", "(303) 426-4348"],
      [38.814, -94.522, 245354, "810 E. North Ave., Belton, MO", "Belton", "(816) 318-8441"],
      [38.926, -94.402, 245355, "695 NW Blue Parkway, Lee's Summit, MO", "Lees Summit", "(816) 347-0186"],
      [38.98, -94.36, 245356, "3680 NE Akin Dr., Lee's Summit, MO", "Lees Summit", "(816) 347-1997"],
      [34.744, -92.276, 245357, "700 S. Broadway St, North Little Rock, AR", "Little Rock", "(501) 372-1600"],
      [34.754, -92.411, 245358, "12206 W Markham St., North Little Rock, AR", "Little Rock", "(501) 223-9400"],
      [34.79, -92.224, 245359, "4120 E McCain Blvd, North Little Rock, AR", "North Little Rock", "(501) 945-9500"],
      [41.196, -111.949, 245360, "3685 Harrison Blvd., South Ogden, UT", "Ogden", "(801) 393-2201"],
      [41.193, -111.979, 245361, "4000 Riverdale Rd, South Ogden, UT", "South Ogden", "(801) 781-2515"],
      [41.152, -111.936, 245362, "1657 E. Skyline Dr, South Ogden, UT", "South Ogden", "(801) 475-6812"],
      [29.563, -98.333, 245363, "7915 Pat Booker Rd, Live Oak, TX", "Live Oak", "(210) 650-4205"],
      [33.711, -112.271, 245364, "25101 N Lake Pleasant Pkwy, Peoria, AZ", "Peoria", "(623) 537-2233"],
      [33.638, -112.36, 245365, "14155 W Bell Rd., Surprise, AZ", "Surprise", "(623) 584-4444"],
      [39.772, -104.799, 245366, "3995 Lewiston St, Aurora, CO", "Aurora", "(303) 574-1200"],
      [39.745, -104.842, 245367, "12501 E. 17th Ave., Aurora, CO", "Aurora", "(303) 366-9000"],
      [39.413, -104.864, 245368, "5646 Allen Way, Castle Rock, CO", "Castle Rock", "(303) 663-9998"],
      [39.366, -104.862, 245369, "390 S Wilcox St, Castle Rock, CO", "Castle Rock", "(303) 867-7770"],
      [38.946, -104.8, 245370, "1590 Briargate Blvd., Colorado Springs, CO", "Colorado Springs", "(719) 203-3278"],
      [39.886, -104.812, 245371, "10449 Chambers Rd, Commerce City, CO", "Commerce City", "(303) 853-4444"],
      [38.751, -104.802, 245372, "1515 Chiles Ave, Fort Carson, CO", "Fort Carson", "(719) 576-7827"],
      [38.745, -104.802, 245373, "3600 Magrath Ave., Fort Carson, CO", "Fort Carson", "(719) 579-7827"],
      [40.408, -105.007, 245374, "1569 Fall River Dr, Loveland, CO", "Loveland", "(970) 624-6077"],
      [39.095, -104.858, 245375, "1773 Lake Woodmoor Dr., Monument, CO", "Monument", "(719) 418-5085"],
      [39.51, -104.766, 245376, "11411 S. 20 Mile Rd, Parker, CO", "Parker", "(303) 840-1220"],
      [40.48, -104.917, 245377, "1180 Main St, Windsor, CO", "Windsor", "(970) 674-1694"],
      [36.06, -95.816, 245378, "2311 W. Kenosha Street, Broken Arrow, OK", "Broken Arrow", "(918) 994-5411"],
      [36.134, -95.922, 245379, "1931 S. Yale Ave, Tulsa, OK", "Tulsa", "(918) 935-3400"],
      [36.113, -95.975, 245380, "3543 S. Peoria Ave, Tulsa, OK", "Tulsa", "(918) 742-4200"],
      [36.061, -95.882, 245381, "8518 E. 71st St., Tulsa, OK", "Tulsa", "(918) 994-4800"],
      [36.104, -95.914, 245382, "5510 E. 41st St., Tulsa, OK", "Tulsa", "(918) 551-7788"],
      [36.032, -95.922, 245383, "9168 S Yale Ave, Tulsa, OK", "Tulsa", "(918) 551-7211"],
      [36.152, -95.989, 245384, "20 E 5th St, Tulsa, OK", "Tulsa", "(918) 935-3955"],
      [36.148, -95.943, 245385, "3148 E. 11th St., Tulsa, OK", "Tulsa", "(918) 949-6600"],
      [32.535, -97.336, 245386, "674 SW Wilshire Blvd, Burleson, TX", "Burleson", "(817) 887-9325"],
      [32.794, -96.777, 245387, "4201 Gaston Ave, Dallas, TX", "Dallas", "(214) 515-9177"],
      [33.055, -96.831, 245388, "6141 Windhaven Pkwy, Plano, TX", "Plano", "(972) 608-1080"],
      [29.516, -98.499, 245389, "7313 San Pedro Ave., San Antonio, TX", "San Antonio", "(210) 340-2224"],
      [29.615, -98.484, 245390, "700 East Sonterra Blvd., San Antonio, TX", "San Antonio", "(210) 490-2999"],
      [29.564, -98.482, 245391, "13446 San Pedro Ave, San Antonio, TX", "San Antonio", "(210) 494-2299"],
      [29.493, -98.435, 245392, "1455 Austin Hwy., San Antonio, TX", "San Antonio", "(210) 822-2277"]
  ];
}());
