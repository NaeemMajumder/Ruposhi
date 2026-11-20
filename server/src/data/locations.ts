/** Bangladesh: 8 divisions → 64 districts → delivery areas. */
export const DIVISIONS: Record<string, string[]> = {
  Dhaka: ['Dhaka', 'Gazipur', 'Narayanganj', 'Narsingdi', 'Manikganj', 'Munshiganj', 'Tangail', 'Kishoreganj', 'Faridpur', 'Gopalganj', 'Madaripur', 'Rajbari', 'Shariatpur'],
  Chattogram: ['Chattogram', "Cox's Bazar", 'Cumilla', 'Feni', 'Noakhali', 'Lakshmipur', 'Chandpur', 'Brahmanbaria', 'Rangamati', 'Khagrachhari', 'Bandarban'],
  Rajshahi: ['Rajshahi', 'Bogura', 'Pabna', 'Sirajganj', 'Natore', 'Naogaon', 'Chapai Nawabganj', 'Joypurhat'],
  Khulna: ['Khulna', 'Jashore', 'Satkhira', 'Bagerhat', 'Kushtia', 'Jhenaidah', 'Magura', 'Narail', 'Chuadanga', 'Meherpur'],
  Barishal: ['Barishal', 'Patuakhali', 'Bhola', 'Pirojpur', 'Barguna', 'Jhalokati'],
  Sylhet: ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'],
  Rangpur: ['Rangpur', 'Dinajpur', 'Kurigram', 'Gaibandha', 'Nilphamari', 'Lalmonirhat', 'Thakurgaon', 'Panchagarh'],
  Mymensingh: ['Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur'],
};

const DHAKA_AREAS = [
  'Dhanmondi', 'Gulshan', 'Banani', 'Baridhara', 'Bashundhara', 'Uttara', 'Mirpur', 'Mohammadpur', 'Badda', 'Rampura',
  'Khilgaon', 'Malibagh', 'Motijheel', 'Tejgaon', 'Mohakhali', 'Cantonment', 'Lalbagh', 'Old Dhaka', 'Jatrabari', 'Shyamoli',
  'Savar', 'Keraniganj',
];

const SPECIAL_AREAS: Record<string, string[]> = {
  Dhaka: DHAKA_AREAS,
  Gazipur: ['Gazipur Sadar', 'Tongi', 'Kaliakair', 'Sreepur'],
  Narayanganj: ['Narayanganj Sadar', 'Fatullah', 'Siddhirganj', 'Rupganj'],
  Chattogram: ['Agrabad', 'GEC', 'Nasirabad', 'Halishahar', 'Panchlaish', 'Chawkbazar', 'Pahartali'],
  Sylhet: ['Zindabazar', 'Amberkhana', 'Shahjalal Upashahar', 'Sylhet Sadar'],
};

export const areasFor = (district: string) => SPECIAL_AREAS[district] ?? [`${district} Sadar`, `${district} (Other upazila)`];

export const SUBURB_AREAS = new Set(['Savar', 'Keraniganj']);
export const SUBURB_DISTRICTS = new Set(['Gazipur', 'Narayanganj']);

export type Zone = 'inside_dhaka' | 'dhaka_suburb' | 'outside_dhaka';

export const zoneFor = (district: string, area: string): Zone => {
  if (district === 'Dhaka') return SUBURB_AREAS.has(area) ? 'dhaka_suburb' : 'inside_dhaka';
  if (SUBURB_DISTRICTS.has(district)) return 'dhaka_suburb';
  return 'outside_dhaka';
};

export const isValidLocation = (division: string, district: string, area: string) =>
  !!DIVISIONS[division]?.includes(district) && areasFor(district).includes(area);

export const locationTree = () =>
  Object.entries(DIVISIONS).map(([division, districts]) => ({
    division,
    districts: districts.map((d) => ({ name: d, areas: areasFor(d) })),
  }));
