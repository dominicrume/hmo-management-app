# Form 03 — Personal Details
Source: Ash Shahada Housing Association, Page 3 of 53

## Fields (exact match required)
title         select    Mr/Mrs/Ms/Miss/Dr    required
full_name     text      max 100 chars        required
dob           date      DD/MM/YYYY format    required
nino          text      "AB 12 34 56 C"      required
nationality   text      free text            required
address       textarea  full postal          required
room_number   text      "Room [N]" format    required
email         email     validates email      optional
date_entry_uk date      if non-UK national   conditional
moved_in      date      move-in date         required
mobile        tel       +44 format           required
languages     text      comma-separated      optional
benefit_type  select    UC/HB/PIP/ESA/JSA   required
benefit_freq  select    Monthly/2wk/Weekly  required
benefit_amountdecimal   GBP, 2dp             required
nok_name      text                           required
nok_relation  text                           required
nok_phone     tel                            required
doctor        text      GP name + surgery    optional

## UI Sections
Group into 6 collapsible sections per DESIGN.md Section 7
Photo capture at top-left of Personal Info section