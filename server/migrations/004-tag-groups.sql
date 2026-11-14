ALTER TABLE tags ADD COLUMN tag_group text
  CHECK (tag_group IN ('Genre', 'Occasion', 'Tempo'));
