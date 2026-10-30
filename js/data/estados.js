// js/data/estados.js — Estados: fronteiras terrestres (ADJ) e terreno de cada UF (bônus de defesa).
// O check confere ADJ contra a geometria do mapa.
// Fronteiras terrestres entre as 27 UFs (simétrica; validada contra a geometria no check.js)
const ADJ = {
  AC:["AM","RO"], AL:["BA","PE","SE"], AP:["PA"], AM:["AC","MT","PA","RO","RR"],
  BA:["AL","ES","GO","MG","PE","PI","SE","TO"], CE:["PB","PE","PI","RN"], DF:["GO","MG"], ES:["BA","MG","RJ"],
  GO:["BA","DF","MG","MS","MT","TO"], MA:["PA","PI","TO"], MT:["AM","GO","MS","PA","RO","TO"], MS:["GO","MG","MT","PR","SP"],
  MG:["BA","DF","ES","GO","MS","RJ","SP"], PA:["AM","AP","MA","MT","RR","TO"], PB:["CE","PE","RN"], PR:["MS","SC","SP"],
  PE:["AL","BA","CE","PB","PI"], PI:["BA","CE","MA","PE","TO"], RJ:["ES","MG","SP"], RN:["CE","PB"], RS:["SC"],
  RO:["AC","AM","MT"], RR:["AM","PA"], SC:["PR","RS"], SP:["MG","MS","PR","RJ"], SE:["AL","BA"], TO:["BA","GO","MA","MT","PA","PI"]
};
// Terreno dominante de cada UF: bônus de defesa
const TERRAIN_TYPES = { selva: { label: "Selva", def: 0.3 }, urbano: { label: "Metrópole", def: 0.25 }, serra: { label: "Serras", def: 0.2 },
  sertao: { label: "Sertão", def: 0.1 }, planalto: { label: "Planalto", def: 0.05 }, cerrado: { label: "Cerrado", def: 0 }, campos: { label: "Pampa e campos", def: 0 } };
const TERRAIN = { AC:"selva", AM:"selva", AP:"selva", PA:"selva", RO:"selva", RR:"selva", MA:"cerrado", TO:"cerrado", GO:"cerrado", MT:"cerrado", MS:"cerrado",
  DF:"urbano", RJ:"urbano", SP:"urbano", MG:"serra", ES:"serra", SC:"serra", PR:"planalto", RS:"campos",
  PI:"sertao", CE:"sertao", RN:"sertao", PB:"sertao", PE:"sertao", AL:"sertao", SE:"sertao", BA:"sertao" };
