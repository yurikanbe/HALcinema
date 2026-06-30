const { PrismaClient } = require('@prisma/client');

const movies = require('../src/data/movies.json');
const theaters = require('../src/data/theaters.json');
const schedules = require('../src/data/schedules.json');

const prisma = new PrismaClient();

const TICKET_TYPES = [
  { nameJa: '一般', basePrice: 1800 },
  { nameJa: '大学生等', basePrice: 1600 },
  { nameJa: '中学・高校生', basePrice: 1400 },
  { nameJa: '小学生・幼児', basePrice: 1000 },
];

const SEAT_LAYOUTS = {
  starry: { rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10 },
  abyss: { rows: ['A', 'B', 'C', 'D', 'E', 'F'], seatsPerRow: 10 },
  cyber: { rows: ['A', 'B', 'C', 'D', 'E'], seatsPerRow: 8 },
};

const THEATER_CONCEPT_NAMES = {
  starry: 'Starry',
  abyss: 'Abyss',
  cyber: 'Cyber',
};

const BASE_SCREENING_DATE = '2026-06-24';

function toDirectors(value) {
  if (!value) return '';
  return Array.isArray(value) ? value.join(', ') : value;
}

function toReleaseDate(year) {
  if (!year) return null;
  return new Date(`${year}-01-01T00:00:00.000Z`);
}

function toScreeningFormat(format) {
  if (format.includes('吹替')) return 'DUBBED';
  if (format.includes('字幕')) return 'SUBTITLED';
  return 'ORIGINAL';
}

function toDateTime(date, time) {
  return new Date(`${date}T${time}:00+09:00`);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function parseScreenLabel(screen) {
  const match = screen.match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function seatCountForTheater(theaterId) {
  const layout = SEAT_LAYOUTS[theaterId];
  return layout.rows.length * layout.seatsPerRow;
}

async function clearReservationData() {
  await prisma.$transaction([
    prisma.seatMoveRequest.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.screeningSeatLock.deleteMany(),
    prisma.bookingSeat.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.screening.deleteMany(),
    prisma.seat.deleteMany(),
    prisma.ticketType.deleteMany(),
    prisma.movieCreator.deleteMany(),
    prisma.userFavorite.deleteMany(),
    prisma.creator.deleteMany(),
    prisma.movie.deleteMany(),
    prisma.screen.deleteMany(),
    prisma.theater.deleteMany(),
  ]);
}

async function seedTicketTypes() {
  await prisma.ticketType.createMany({
    data: TICKET_TYPES.map((ticketType) => ({
      nameJa: ticketType.nameJa,
      basePrice: ticketType.basePrice,
      isActive: true,
    })),
  });
}

async function seedMovies() {
  const movieIdBySlug = new Map();

  for (const movie of movies) {
    const created = await prisma.movie.create({
      data: {
        slug: movie.id,
        titleJa: movie.title,
        titleEn: null,
        genre: movie.category,
        durationMinutes: movie.duration,
        description: movie.description,
        posterImageUrl: movie.poster,
        isActive: movie.status === 'now_showing',
        releaseDate: toReleaseDate(movie.year),
      },
    });

    movieIdBySlug.set(movie.id, created.id);

    const directors = toDirectors(movie.director);
    if (directors) {
      const creator = await prisma.creator.create({
        data: {
          name: directors,
          role: 'DIRECTOR',
        },
      });

      await prisma.movieCreator.create({
        data: {
          movieId: created.id,
          creatorId: creator.id,
          role: 'DIRECTOR',
        },
      });
    }
  }

  return movieIdBySlug;
}

async function seedTheatersScreensAndSeats() {
  const theaterIdBySlug = new Map();
  const screenIdByKey = new Map();
  let globalScreenNumber = 1;

  for (const theater of theaters) {
    const createdTheater = await prisma.theater.create({
      data: {
        name: theater.name,
        description: theater.description,
        imageUrl: theater.heroImage,
      },
    });
    theaterIdBySlug.set(theater.id, createdTheater.id);
  }

  for (const schedule of schedules) {
    const theaterSlug = schedule.theaterId;
    const screenKey = `${theaterSlug}:${schedule.screen}`;
    const layout = SEAT_LAYOUTS[theaterSlug];

    if (!layout || screenIdByKey.has(screenKey)) continue;

    const screen = await prisma.screen.create({
      data: {
        theaterId: theaterIdBySlug.get(theaterSlug),
        screenNumber: globalScreenNumber,
        conceptName: `${THEATER_CONCEPT_NAMES[theaterSlug]} ${parseScreenLabel(schedule.screen)}`,
        description: `${schedule.screen} / ${THEATER_CONCEPT_NAMES[theaterSlug]} Theater`,
        imageUrl: `/images/${theaterSlug}/seatmap.png`,
        seatCount: seatCountForTheater(theaterSlug),
      },
    });

    globalScreenNumber += 1;
    screenIdByKey.set(screenKey, screen.id);

    const seats = [];
    for (const row of layout.rows) {
      for (let number = 1; number <= layout.seatsPerRow; number += 1) {
        seats.push({
          screenId: screen.id,
          rowLabel: row,
          seatNumber: number,
          isPremium: row === 'A' || row === 'B',
          isAccessible: row === layout.rows[layout.rows.length - 1] && number <= 2,
        });
      }
    }

    await prisma.seat.createMany({ data: seats });
  }

  return screenIdByKey;
}

async function seedScreenings(movieIdBySlug, screenIdByKey) {
  const screenings = [];

  for (const schedule of schedules) {
    const screenId = screenIdByKey.get(`${schedule.theaterId}:${schedule.screen}`);
    if (!screenId) continue;

    for (const show of schedule.shows) {
      const movieId = movieIdBySlug.get(show.movieId);
      if (!movieId) continue;

      const startTime = toDateTime(BASE_SCREENING_DATE, show.start);
      const endTime = addMinutes(startTime, show.duration);

      screenings.push({
        movieId,
        screenId,
        startTime,
        endTime,
        format: toScreeningFormat(show.format),
        status: show.taken ? 'CANCELLED' : 'SCHEDULED',
      });
    }
  }

  await prisma.screening.createMany({ data: screenings });
}

async function main() {
  await clearReservationData();
  await seedTicketTypes();
  const movieIdBySlug = await seedMovies();
  const screenIdByKey = await seedTheatersScreensAndSeats();
  await seedScreenings(movieIdBySlug, screenIdByKey);

  const counts = {
    movies: await prisma.movie.count(),
    theaters: await prisma.theater.count(),
    screens: await prisma.screen.count(),
    seats: await prisma.seat.count(),
    screenings: await prisma.screening.count(),
    ticketTypes: await prisma.ticketType.count(),
  };

  console.log('Seed completed:', counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
