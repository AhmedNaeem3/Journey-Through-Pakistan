import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getAnalytics, getUserTrends, getTopPlaces, getChatActivity, getPakistanRegions, getTourismMetrics } from '../services/adminApi';

const AnalyticsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpiData, setKpiData] = useState(null);
  const [userTrends, setUserTrends] = useState([]);
  const [topPlaces, setTopPlaces] = useState([]);
  const [chatActivity, setChatActivity] = useState([]);
  const [pakistanRegions, setPakistanRegions] = useState([]);
  const [tourismMetrics, setTourismMetrics] = useState(null);

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      
      const [analyticsRes, trendsRes, placesRes, chatRes, regionsRes, tourismRes] = await Promise.all([
        getAnalytics(),
        getUserTrends(),
        getTopPlaces(),
        getChatActivity(),
        getPakistanRegions(),
        getTourismMetrics()
      ]);

      setKpiData(analyticsRes.data);
      setUserTrends(trendsRes.data || []);
      setTopPlaces((placesRes.data || []).slice(0, 5));
      setChatActivity(chatRes.data || []);
      setPakistanRegions(regionsRes.data || []);
      setTourismMetrics(tourismRes.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const kpiCards = kpiData ? [
    {
      title: 'Total Signups',
      value: kpiData.kpis?.totalSignups?.toLocaleString() || '0',
      change: `+${kpiData.newSignups || 0} in last 30 days`,
      icon: '👥',
    },
    {
      title: 'Active Users',
      value: kpiData.kpis?.activeUsers?.toLocaleString() || '0',
      change: 'Last 24 hours',
      icon: '🕐',
    },
    {
      title: 'Avg. Session',
      value: kpiData.kpis?.avgSessionDuration || '00:00',
      change: 'Average time spent',
      icon: '⏱️',
    },
    {
      title: 'Engagement',
      value: kpiData.kpis?.contentEngagement || '0%',
      change: 'Active users ratio',
      icon: '📊',
    }
  ] : [];

  const tourismSummary = tourismMetrics ? [
    { label: 'Places Shared', value: tourismMetrics.totalPlaces || 0, icon: '📍' },
    { label: 'New Places Today', value: tourismMetrics.newPlacesToday || 0, icon: '📸' },
    { label: 'Unique Destinations', value: tourismMetrics.uniquePlacesCount || 0, icon: '❤️' }
  ] : [];

  if (loading && !kpiData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchAllAnalytics();
          }} tintColor="#7c3aed" />
        }
      >
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          {kpiCards.map((card, index) => (
            <View key={index} style={styles.kpiCard}>
              <Text style={styles.kpiIcon}>{card.icon}</Text>
              <Text style={styles.kpiLabel}>{card.title}</Text>
              <Text style={styles.kpiValue}>{card.value}</Text>
              <Text style={styles.kpiChange}>{card.change}</Text>
            </View>
          ))}
        </View>

        {/* User Trends Chart */}
        {userTrends.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>New & Active User Trends</Text>
            <Text style={styles.chartSubtitle}>Monthly trends for new registrations and daily active users.</Text>
            <View style={styles.chartData}>
              {userTrends.map((item, index) => (
                <View key={index} style={styles.chartItem}>
                  <Text style={styles.chartLabel}>{item.month}</Text>
                  <View style={styles.chartBarContainer}>
                    <View style={[styles.chartBar, { width: `${(item.activeUsers / 15) * 100}%`, backgroundColor: '#6366f1' }]} />
                    <View style={[styles.chartBar, { width: `${(item.newUsers / 15) * 100}%`, backgroundColor: '#0ea5e9', marginLeft: 4 }]} />
                  </View>
                  <Text style={styles.chartValue}>A:{item.activeUsers} N:{item.newUsers}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Places Chart */}
        {topPlaces.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Top 5 Most Visited Places</Text>
            <Text style={styles.chartSubtitle}>Most popular destinations shared by users in Pakistan.</Text>
            <View style={styles.chartData}>
              {topPlaces.map((item, index) => (
                <View key={index} style={styles.chartItem}>
                  <Text style={styles.chartLabel}>{item.place}</Text>
                  <View style={styles.chartBarContainer}>
                    <View style={[styles.chartBar, { width: `${(item.searches / 10) * 100}%`, backgroundColor: '#38bdf8' }]} />
                  </View>
                  <Text style={styles.chartValue}>{item.searches}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Chat Activity Chart */}
        {chatActivity.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Chat Activity & Content Creation</Text>
            <Text style={styles.chartSubtitle}>Monthly overview of user communication and content sharing.</Text>
            <View style={styles.chartData}>
              {chatActivity.map((item, index) => (
                <View key={index} style={styles.chartItem}>
                  <Text style={styles.chartLabel}>{item.month}</Text>
                  <View style={styles.chartBarContainer}>
                    <View style={[styles.chartBar, { width: `${(item.chat / 10) * 100}%`, backgroundColor: '#8b5cf6' }]} />
                    <View style={[styles.chartBar, { width: `${(item.downloads / 10) * 100}%`, backgroundColor: '#f97316', marginLeft: 4 }]} />
                  </View>
                  <Text style={styles.chartValue}>C:{item.chat} P:{item.downloads}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pakistan Regions */}
        {pakistanRegions.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>User Distribution by Province</Text>
            <Text style={styles.chartSubtitle}>Distribution of users across Pakistan's provinces.</Text>
            <View style={styles.regionsList}>
              {pakistanRegions.map(({ region, usage, percentage, highlight }, index) => (
                <View key={index} style={[styles.regionItem, highlight && styles.regionItemHighlight]}>
                  <View style={styles.regionInfo}>
                    <Text style={styles.regionName}>{region}</Text>
                    <Text style={styles.regionUsage}>{percentage}% ({usage} users)</Text>
                  </View>
                  <View style={styles.regionBar}>
                    <View style={[styles.regionBarFill, { width: `${percentage}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tourism Summary */}
        {tourismSummary.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Tourism Metrics</Text>
            <View style={styles.summaryGrid}>
              {tourismSummary.map((item, index) => (
                <View key={index} style={styles.summaryItem}>
                  <Text style={styles.summaryIcon}>{item.icon}</Text>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    color: '#7c3aed',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 15,
  },
  kpiCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  kpiIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  kpiChange: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  chartData: {
    marginTop: 10,
  },
  chartItem: {
    marginBottom: 12,
  },
  chartLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  chartBarContainer: {
    flexDirection: 'row',
    height: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    marginBottom: 4,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    borderRadius: 10,
  },
  chartValue: {
    fontSize: 11,
    color: '#9ca3af',
  },
  regionsList: {
    marginTop: 10,
  },
  regionItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  regionItemHighlight: {
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  regionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  regionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  regionUsage: {
    fontSize: 12,
    color: '#6b7280',
  },
  regionBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  regionBarFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 4,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default AnalyticsScreen;

