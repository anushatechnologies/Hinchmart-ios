import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const WarehouseIllustration: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* City/Logistics Skyline Background Silhouettes */}
      <View style={styles.skylineWrapper}>
        <View style={[styles.skylineBuilding, { left: 8, width: 38, height: 60 }]} />
        <View style={[styles.skylineBuilding, { left: 46, width: 44, height: 85 }]} />
        <View style={[styles.skylineBuilding, { left: 94, width: 30, height: 48 }]} />
        <View style={[styles.skylineBuilding, { left: 216, width: 42, height: 75 }]} />
        <View style={[styles.skylineBuilding, { left: 260, width: 50, height: 90 }]} />
        <View style={[styles.skylineBuilding, { left: 318, width: 36, height: 55 }]} />
      </View>

      {/* Foreground Warehouse Complex & Logistics Scene */}
      <View style={styles.sceneContainer}>
        {/* Left Delivery Truck */}
        <View style={styles.truckContainer}>
          {/* Cargo Container */}
          <View style={styles.truckBody}>
            <View style={styles.truckBodyLine} />
          </View>
          {/* Truck Cabin */}
          <View style={styles.truckCabin}>
            <View style={styles.truckWindow} />
            <View style={styles.truckHeadlight} />
          </View>
          {/* Truck Wheels */}
          <View style={[styles.wheel, { left: 6 }]} />
          <View style={[styles.wheel, { left: 40 }]} />
        </View>

        {/* Forklift & Pallet */}
        <View style={styles.forkliftContainer}>
          {/* Mast & Cage */}
          <View style={styles.forkliftMast} />
          <View style={styles.forkliftCabin} />
          <View style={styles.forkliftCounterweight} />
          {/* Forklift Wheel */}
          <View style={[styles.forkliftWheel, { left: 2 }]} />
          <View style={[styles.forkliftWheel, { left: 16 }]} />
          {/* Orange Box on Fork */}
          <View style={styles.forkliftBox}>
            <View style={styles.boxTape} />
          </View>
        </View>

        {/* Warehouse Building */}
        <View style={styles.warehouseBuilding}>
          {/* HinchMart Signboard */}
          <View style={styles.warehouseSignboard}>
            <Text style={styles.warehouseSignText}>HINCHMART</Text>
          </View>

          {/* Warehouse Shutter Bay 1 */}
          <View style={styles.shutterBay}>
            <View style={styles.shutterStripe} />
            <View style={styles.shutterStripe} />
            <View style={styles.shutterStripe} />
            <View style={styles.shutterStripe} />
          </View>

          {/* Stacked Cargo Boxes */}
          <View style={styles.stackedBoxesContainer}>
            <View style={[styles.cargoBox, { width: 16, height: 16, top: 0, left: 4 }]}>
              <View style={styles.boxTape} />
            </View>
            <View style={[styles.cargoBox, { width: 15, height: 15, top: 14, left: 0 }]}>
              <View style={styles.boxTape} />
            </View>
            <View style={[styles.cargoBox, { width: 14, height: 15, top: 14, left: 15 }]}>
              <View style={styles.boxTape} />
            </View>
          </View>

          {/* Warehouse Shutter Bay 2 */}
          <View style={styles.shutterBay}>
            <View style={styles.shutterStripe} />
            <View style={styles.shutterStripe} />
            <View style={styles.shutterStripe} />
            <View style={styles.shutterStripe} />
          </View>
        </View>
      </View>

      {/* Ground Orange Horizon Line */}
      <View style={styles.groundLine} />

      {/* Footer Update Status */}
      <Text style={styles.footerStatusText}>Checking for new update...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 10,
  },
  skylineWrapper: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    height: 95,
    overflow: 'hidden',
  },
  skylineBuilding: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#EDF2F7',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  sceneContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 86,
  },
  // Delivery Truck
  truckContainer: {
    width: 62,
    height: 38,
    position: 'relative',
    marginBottom: 2,
  },
  truckBody: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 38,
    height: 25,
    backgroundColor: '#8FA1B5',
    borderRadius: 2,
  },
  truckBodyLine: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#7A8C9E',
  },
  truckCabin: {
    position: 'absolute',
    left: 36,
    top: 10,
    width: 18,
    height: 19,
    backgroundColor: '#9BAEC0',
    borderTopRightRadius: 6,
  },
  truckWindow: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 10,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderTopRightRadius: 4,
  },
  truckHeadlight: {
    position: 'absolute',
    bottom: 3,
    right: 0,
    width: 3,
    height: 4,
    backgroundColor: '#FDE047',
  },
  wheel: {
    position: 'absolute',
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#334155',
    borderWidth: 1.5,
    borderColor: '#94A3B8',
  },
  // Forklift
  forkliftContainer: {
    width: 36,
    height: 36,
    position: 'relative',
    marginBottom: 2,
    marginRight: 4,
  },
  forkliftMast: {
    position: 'absolute',
    right: 8,
    top: 2,
    width: 3,
    height: 26,
    backgroundColor: '#334155',
  },
  forkliftCabin: {
    position: 'absolute',
    left: 4,
    top: 6,
    width: 16,
    height: 20,
    borderColor: '#475569',
    borderWidth: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  forkliftCounterweight: {
    position: 'absolute',
    left: 0,
    top: 16,
    width: 10,
    height: 12,
    backgroundColor: '#64748B',
    borderRadius: 2,
  },
  forkliftWheel: {
    position: 'absolute',
    bottom: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
  forkliftBox: {
    position: 'absolute',
    right: 0,
    top: 14,
    width: 12,
    height: 13,
    backgroundColor: '#F97316',
    borderRadius: 1,
  },
  // Warehouse Building
  warehouseBuilding: {
    flex: 1,
    height: 64,
    backgroundColor: '#E2E8F0',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: 2,
    position: 'relative',
    marginLeft: 6,
  },
  warehouseSignboard: {
    position: 'absolute',
    top: 5,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 2.5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  warehouseSignText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0B2545',
    letterSpacing: 1,
  },
  shutterBay: {
    width: 38,
    height: 32,
    backgroundColor: '#8FA1B5',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 2,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#718096',
  },
  shutterStripe: {
    height: 3,
    backgroundColor: '#CBD5E1',
    borderRadius: 1,
  },
  stackedBoxesContainer: {
    width: 32,
    height: 30,
    position: 'relative',
  },
  cargoBox: {
    position: 'absolute',
    backgroundColor: '#F97316',
    borderRadius: 1.5,
    borderWidth: 0.5,
    borderColor: '#EA580C',
  },
  boxTape: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  // Ground Horizon Line
  groundLine: {
    width: '100%',
    height: 2.5,
    backgroundColor: '#F97316',
  },
  footerStatusText: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 6,
    marginBottom: 4,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
