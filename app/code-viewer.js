import { View } from 'react-native';
import { ViewCode } from '../src/components/ViewCode';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function CodeViewerScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams();

    return (
        <View style={{ flex: 1 }}>
            <ViewCode
                isVisible={true}
                onClose={() => router.dismiss()}
                code={code}
            />
        </View>
    );
}
