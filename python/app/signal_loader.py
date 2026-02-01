"""
Signal Loader - Loads and parses CSV signal files
"""
import csv
import os
from typing import List, Dict, Any
from pathlib import Path


class SignalLoader:
    """Loads signal definitions from CSV files"""
    
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            # Default to project's data/signals directory
            data_dir = Path(__file__).parent.parent.parent / "data" / "signals"
        self.data_dir = Path(data_dir)
    
    def load_buying_intent_signals(self) -> List[Dict[str, Any]]:
        """Load universal buying intent signals with weights"""
        signals = []
        file_path = self.data_dir / "buying-intent.csv"
        
        if not file_path.exists():
            print(f"Warning: {file_path} not found")
            return self._get_default_buying_intent_signals()
        
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    signal = row.get('Signal', '').strip()
                    meaning = row.get('What It Means', '').strip()
                    opportunity = row.get('Sales Opportunity', '').strip()
                    
                    if signal and not signal.startswith('Universal'):
                        # Assign weights based on signal type
                        weight = self._calculate_intent_weight(signal, meaning)
                        signals.append({
                            'name': signal,
                            'meaning': meaning,
                            'opportunity': opportunity,
                            'weight': weight,
                            'category': 'buying_intent'
                        })
        except Exception as e:
            print(f"Error loading buying intent signals: {e}")
            return self._get_default_buying_intent_signals()
        
        return signals
    
    def load_red_flag_signals(self) -> List[Dict[str, Any]]:
        """Load red flag indicators with negative weights"""
        signals = []
        file_path = self.data_dir / "red-flags.csv"
        
        if not file_path.exists():
            print(f"Warning: {file_path} not found")
            return self._get_default_red_flags()
        
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    red_flag = row.get('Red Flag', '').strip()
                    implication = row.get('Implication', '').strip()
                    
                    if red_flag and not red_flag.startswith('Red Flag'):
                        weight = self._calculate_red_flag_weight(red_flag, implication)
                        signals.append({
                            'name': red_flag,
                            'implication': implication,
                            'weight': weight,  # Negative weight
                            'category': 'red_flag'
                        })
        except Exception as e:
            print(f"Error loading red flag signals: {e}")
            return self._get_default_red_flags()
        
        return signals
    
    def load_hiring_signals(self) -> List[Dict[str, Any]]:
        """Load detailed hiring signals from signals.csv"""
        signals = []
        file_path = self.data_dir / "signals.csv"
        
        if not file_path.exists():
            print(f"Warning: {file_path} not found")
            return self._get_default_hiring_signals()
        
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                current_category = None
                
                for row in reader:
                    category = row.get('Category', '').strip()
                    criteria = row.get('Specific Criteria', '').strip()
                    source = row.get('Where to Find', '').strip()
                    
                    if category:
                        current_category = category
                    
                    if criteria:
                        weight = self._calculate_hiring_weight(current_category, criteria)
                        signals.append({
                            'category': current_category,
                            'name': criteria,
                            'source': source,
                            'weight': weight
                        })
        except Exception as e:
            print(f"Error loading hiring signals: {e}")
            return self._get_default_hiring_signals()
        
        return signals
    
    def _calculate_intent_weight(self, signal: str, meaning: str) -> float:
        """Calculate weight for buying intent signal (0-40 points)"""
        signal_lower = signal.lower()
        meaning_lower = meaning.lower()
        
        # C-level changes are highest weight
        if 'c-level' in signal_lower or 'executive' in signal_lower:
            return 35.0
        # Rapid growth is high
        if 'rapid' in signal_lower or '20%' in signal_lower:
            return 30.0
        # First-time roles indicate clear need
        if 'first-time' in signal_lower:
            return 28.0
        # Technology/platform signals
        if 'devops' in signal_lower or 'infrastructure' in signal_lower:
            return 25.0
        # Data/analytics hiring
        if 'data' in signal_lower or 'analytics' in signal_lower:
            return 25.0
        # Security/compliance
        if 'security' in signal_lower or 'compliance' in signal_lower:
            return 22.0
        # Revenue roles
        if 'revenue' in signal_lower or 'sdr' in signal_lower:
            return 20.0
        # Default moderate weight
        return 18.0
    
    def _calculate_red_flag_weight(self, flag: str, implication: str) -> float:
        """Calculate negative weight for red flags (-50 to -10 points)"""
        flag_lower = flag.lower()
        
        # Most severe: indicates company is contracting
        if 'declining headcount' in flag_lower:
            return -45.0
        if 'mass departures' in flag_lower:
            return -40.0
        if 'executive turnover' in flag_lower:
            return -35.0
        if 'layoffs' in flag_lower:
            return -30.0
        if 'no hiring' in flag_lower:
            return -25.0
        if 'long-open positions' in flag_lower:
            return -15.0
        if 'junior' in flag_lower and 'senior problems' in flag_lower:
            return -20.0
        if 'contractor' in flag_lower:
            return -10.0
        return -15.0
    
    def _calculate_hiring_weight(self, category: str, criteria: str) -> float:
        """Calculate weight for hiring signal (0-20 points)"""
        if not category:
            return 5.0
        
        category_lower = category.lower()
        criteria_lower = criteria.lower()
        
        # High priority categories
        if 'key role' in category_lower:
            if 'c-level' in criteria_lower or 'vp' in criteria_lower:
                return 18.0
            return 12.0
        if 'hiring velocity' in category_lower:
            if 'spike' in criteria_lower or 'growth rate' in criteria_lower:
                return 15.0
            return 10.0
        if 'skill gaps' in category_lower:
            return 12.0
        if 'organizational changes' in category_lower:
            if 'reorganization' in criteria_lower:
                return 10.0
            return 8.0
        if 'employee sentiment' in category_lower:
            return 6.0
        
        return 5.0
    
    def _get_default_buying_intent_signals(self) -> List[Dict[str, Any]]:
        """Default buying intent signals if CSV not found"""
        return [
            {'name': 'New C-level executive', 'weight': 35.0, 'category': 'buying_intent'},
            {'name': 'Rapid headcount growth (20%+ YoY)', 'weight': 30.0, 'category': 'buying_intent'},
            {'name': 'First-time specialized roles', 'weight': 28.0, 'category': 'buying_intent'},
            {'name': 'DevOps/Infrastructure hiring', 'weight': 25.0, 'category': 'buying_intent'},
            {'name': 'Data/Analytics roles', 'weight': 25.0, 'category': 'buying_intent'},
            {'name': 'Customer Success hiring spree', 'weight': 22.0, 'category': 'buying_intent'},
            {'name': 'Revenue roles expansion', 'weight': 20.0, 'category': 'buying_intent'},
        ]
    
    def _get_default_red_flags(self) -> List[Dict[str, Any]]:
        """Default red flags if CSV not found"""
        return [
            {'name': 'Declining headcount trend', 'weight': -45.0, 'category': 'red_flag'},
            {'name': 'Mass departures to competitor', 'weight': -40.0, 'category': 'red_flag'},
            {'name': 'High executive turnover', 'weight': -35.0, 'category': 'red_flag'},
            {'name': 'Layoffs while hiring', 'weight': -30.0, 'category': 'red_flag'},
            {'name': 'No hiring in critical departments', 'weight': -25.0, 'category': 'red_flag'},
            {'name': 'Long-open positions (90+ days)', 'weight': -15.0, 'category': 'red_flag'},
        ]
    
    def _get_default_hiring_signals(self) -> List[Dict[str, Any]]:
        """Default hiring signals if CSV not found"""
        return [
            {'category': 'Hiring Velocity', 'name': 'Open positions count', 'weight': 10.0},
            {'category': 'Key Role Indicators', 'name': 'New executive hires', 'weight': 15.0},
            {'category': 'Skill Gaps', 'name': 'Technology requirements', 'weight': 12.0},
        ]
