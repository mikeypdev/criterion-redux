import React from 'react';
import { Link } from 'react-router-dom';
import type { Person } from '../types';
import styles from '../styles/personLink.module.css';

interface PersonLinkProps {
  person: Person;
}

const PersonLink: React.FC<PersonLinkProps> = ({ person }) => {
  return (
    <Link 
      to={`/person/${person.id}`}
      className={styles.link} 
      title={`See all films by ${person.name}`}
      onClick={(e) => e.stopPropagation()}
    >
      {person.name}
    </Link>
  );
};

export default PersonLink;
