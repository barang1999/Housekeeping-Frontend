import React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useTranslation } from '../i18n/LanguageProvider';

const LanguageSwitcher = () => {
  const { language, setLanguage, supportedLanguages, t } = useTranslation();

  const handleChange = (event) => {
    setLanguage(event.target.value);
  };

  return (
    <FormControl size="small" variant="outlined" sx={{ minWidth: 120, mr: 1 }}>
      <InputLabel id="language-switcher-label">{t('language.label', 'Language')}</InputLabel>
      <Select
        labelId="language-switcher-label"
        id="language-switcher"
        value={language}
        label={t('language.label', 'Language')}
        onChange={handleChange}
      >
        {supportedLanguages.map((lang) => (
          <MenuItem key={lang.code} value={lang.code}>
            {t(`language.${lang.code}`, lang.label)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default LanguageSwitcher;
