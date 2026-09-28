/**
 * Barbershop photography, served by Unsplash's image CDN (free Unsplash License; hot-linking the
 * CDN is what Unsplash asks for). Replace `id` with the shop's own photos when there are some.
 */
export type Photo = { id: string; alt: string; credit: string };

export const PHOTOS = {
  chair: {
    id: "1585747860715-2ba37e788b70",
    alt: "Silla de barbero de cuero negro frente a una pared de ladrillo",
    credit: "Nathon Oski",
  },
  client: {
    id: "1503951914875-452162b0f3f1",
    alt: "Cliente sentado en la silla del barbero durante su corte",
    credit: "Allef Vinicius",
  },
  tools: {
    id: "1621605815971-fbc98d665033",
    alt: "Máquina, tijeras, peine y productos de barbería sobre una tabla",
    credit: "Andrea Donato",
  },
  razor: {
    id: "1599351431202-1e0f0137899a",
    alt: "Barbero perfilando con navaja el corte de un cliente",
    credit: "Agustin Fernandez",
  },
  scissors: {
    id: "1593702275687-f8b402bf1fb5",
    alt: "Barbero cortando el cabello con tijera y peine",
    credit: "Michael DeMoya",
  },
  classicChair: {
    id: "1621645582931-d1d3e6564943",
    alt: "Silla de barbería clásica en negro y plata",
    credit: "Joshua Lawrence",
  },
  styling: {
    id: "1605497788044-5a32c7078486",
    alt: "Barbero con delantal secando y peinando el cabello de un cliente",
    credit: "delfina pan",
  },
  detail: {
    id: "1635273051937-a0ddef9573b6",
    alt: "Cliente recibiendo un corte de cabello",
    credit: "Salah Regouane",
  },
} satisfies Record<string, Photo>;

/** Base CDN URL; `src/lib/image-loader.ts` adds the width and compression per request. */
export function photoSrc(photo: Photo): string {
  return `https://images.unsplash.com/photo-${photo.id}`;
}
