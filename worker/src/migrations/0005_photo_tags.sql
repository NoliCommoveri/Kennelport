-- What each photo is of (a dog, a litter, a puppy, an extra, the Home page or
-- Our story), so a dog's form can offer that dog's photos first instead of every
-- photo on the site. Only the breeder sees these; nothing about them is
-- published. `subject` is "<kind>:<id>" (dog:…, litter:…, puppy:…, extra:…) or
-- "page:home" / "page:about". A photo can be of several things (a dam with her
-- litter), so this is its own table.
CREATE TABLE IF NOT EXISTS photo_tags (
  site_id   TEXT NOT NULL REFERENCES sites(id),
  photo_id  TEXT NOT NULL REFERENCES photos(id),
  subject   TEXT NOT NULL,
  PRIMARY KEY (photo_id, subject)
);
CREATE INDEX IF NOT EXISTS idx_photo_tags_subject ON photo_tags (site_id, subject);
