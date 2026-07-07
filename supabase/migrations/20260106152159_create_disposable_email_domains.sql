/*
  # Create Disposable Email Domains Table

  1. New Tables
    - `disposable_email_domains`
      - `id` (uuid, primary key)
      - `domain` (text, unique, indexed) - The disposable email domain
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `disposable_email_domains` table
    - Add policy for public read access (to check emails)
    - Only admins can write to this table (handled by RLS)
  
  3. Data
    - Insert all disposable email domains from the provided list
  
  4. Performance
    - Add index on domain column for fast lookups
*/

-- Create the table
CREATE TABLE IF NOT EXISTS disposable_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_disposable_email_domains_domain ON disposable_email_domains(domain);

-- Enable RLS
ALTER TABLE disposable_email_domains ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (for validation)
CREATE POLICY "Anyone can read disposable email domains"
  ON disposable_email_domains
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Only service role can modify disposable email domains"
  ON disposable_email_domains
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert disposable email domains (batch 1 of 4)
INSERT INTO disposable_email_domains (domain) VALUES
('0-mail.com'),('027168.com'),('062e.com'),('0815.ru'),('0815.su'),('0845.ru'),('0box.eu'),('0cd.cn'),('0clickemail.com'),('0n0ff.net'),('0nelce.com'),('0rg.fr'),('0v.ro'),('0w.ro'),('0wnd.net'),('0wnd.org'),('0x207.info'),('1-8.biz'),('1-second-mail.site'),('1-tm.com'),('10-minute-mail.com'),('1000rebates.stream'),('100likers.com'),('105kg.ru'),('10dk.email'),('10inbox.online'),('10mail.com'),('10mail.org'),('10mail.tk'),('10mail.xyz'),('10minemail.com'),('10minmail.de'),('10minut.com.pl'),('10minut.xyz'),('10minutemail.be'),('10minutemail.cf'),('10minutemail.co.uk'),('10minutemail.co.za'),('10minutemail.com'),('10minutemail.de'),('10minutemail.ga'),('10minutemail.gq'),('10minutemail.ml'),('10minutemail.net'),('10minutemail.nl'),('10minutemail.pro'),('10minutemail.us'),('10minutemailbox.com'),('10minutemails.in'),('10minutenemail.de'),('10minutenmail.xyz'),('10minutesmail.com'),('10minutesmail.fr'),('10minutmail.pl'),('10x9.com'),('11163.com'),('123-m.com'),('123clone.com'),('12hosting.net'),('12houremail.com'),('12minutemail.com'),('12minutemail.net'),('12storage.com'),('1337.care'),('140unichars.com'),('147.cl'),('14club.org.uk'),('14n.co.uk'),('15qm.com'),('189.email'),('191mariobet.com'),('1blackmoon.com'),('1ce.us'),('1chuan.com'),('1clck2.com'),('1fsdfdsfsdf.tk'),('1mail.ml'),('1nom.org'),('1pad.de'),('1s.fr'),('1sec.site'),('1secmail.com'),('1secmail.net'),('1secmail.org'),('1secmail.space'),('1secmail.website'),('1st-forms.com'),('1sworld.com'),('1to1mail.org'),('1trick.net'),('1usemail.com'),('1webmail.info'),('1xp.fr'),('1zhuan.com'),('2012-2016.ru'),('20email.eu'),('20email.it'),('20mail.eu'),('20mail.in'),('20mail.it'),('20minutemail.com'),('20minutemail.it'),('20minutesmail.com'),('20mm.eu'),('2120001.net'),('21cn.com'),('2200freefonts.com'),('247web.net'),('24faw.com'),('24hinbox.com'),('24hourmail.com'),('24hourmail.net'),('25u.com'),('2anom.com'),('2chmail.net'),('2ether.net'),('2fdgdfgdfgdf.tk'),('2odem.com'),('2prong.com'),('2wc.info'),('300book.info'),('30mail.ir'),('30minutemail.com'),('30wave.com'),('3202.com'),('36ru.com'),('3a88.dev'),('3d-painting.com'),('3fdn.com'),('3l6.com'),('3littlemiracles.com'),('3mail.ga'),('3trtretgfrfe.tk'),('4-n.us'),('4057.com'),('418.dk'),('42o.org'),('42web.io'),('48dz.com'),('48hr.email'),('4gfdsgfdgfd.tk'),('4k5.net'),('4mail.cf'),('4mail.ga'),('4nextmail.com'),('4nmv.ru'),('4pu.com'),('4tb.host'),('4warding.com'),('4warding.net'),('4warding.org'),('50set.ru'),('55hosting.net'),('5ghgfhfghfgh.tk'),('5gramos.com'),('5july.org'),('5mail.cf'),('5mail.ga'),('5minutemail.net'),('5oz.ru'),('5semail.com'),('5tb.in'),('5x25.com'),('5ymail.com'),('60minutemail.com'),('672643.net'),('675hosting.com'),('675hosting.net'),('675hosting.org'),('6hjgjhgkilkj.tk'),('6ip.us'),('6mail.cf'),('6mail.ga'),('6mail.ml'),('6n9.net'),('6paq.com'),('6somok.ru'),('6url.com'),('75hosting.com'),('75hosting.net'),('75hosting.org'),('7days-printing.com'),('7mail.ga'),('7mail.ml'),('7tags.com'),('80665.com'),('8127ep.com'),('8mail.cf'),('8mail.ga'),('8mail.ml'),('99.com'),('99cows.com'),('99experts.com'),('9mail.cf'),('9me.site'),('9mot.ru'),('9ox.net'),('9q.ro')
ON CONFLICT (domain) DO NOTHING;